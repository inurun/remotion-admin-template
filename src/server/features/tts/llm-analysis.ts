import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { G2pItem } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import { analyzeTexts } from "@/server/features/haqumei-api/analyze";
import { HaqumeiApiError } from "@/server/features/haqumei-api/error";
import {
  assertHaqumeiValidateBatch,
  HAQUMEI_MAX_BATCH_SIZE,
  HAQUMEI_MAX_TEXT_CHARS,
  HAQUMEI_MAX_TOTAL_CHARS,
} from "@/server/features/haqumei-api/limits";
import { validateG2pItems } from "@/server/features/haqumei-api/validate";
import {
  ttsLlmAnalysisRequestSchema,
  ttsLlmAnalysisResponseSchema,
  type TtsLlmAnalysisResponse,
} from "./contract";
import {
  getOpenRouterConfig,
  OpenRouterError,
  requestOpenRouterCorrections,
  type OpenRouterPromptItem,
} from "./openrouter";
import { getEffectiveReadText } from "./providers/comparison";

type RunStage = "prepare" | "haqumei-baseline" | "openrouter" | "haqumei-validate" | "log";

const ZERO_USAGE = {
  promptTokens: 0,
  completionTokens: 0,
  reasoningTokens: 0,
  cachedTokens: 0,
  totalTokens: 0,
  costUsd: 0,
};

function elapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

function getLogFile(runId: string, startedAt: string) {
  const fileName = `${startedAt.replaceAll(":", "-").replaceAll(".", "-")}-${runId}.json`;
  return path.join(".logs", "llm-g2p", fileName);
}

async function writeRunLog(logFile: string, value: unknown) {
  const absolutePath = path.join(process.cwd(), logFile);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function serializeError(error: unknown) {
  if (error instanceof OpenRouterError) {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      responseBody: error.responseBody,
    };
  }
  if (error instanceof HaqumeiApiError) {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code,
      detail: error.detail,
      errors: error.errors,
    };
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function formatPipelineError(error: unknown, eligibleIds: string[]) {
  if (error instanceof HaqumeiApiError) {
    const fields = error.errors
      .map((item) => {
        const match = /^items\[(\d+)\]/u.exec(item.path);
        const ttsId = match ? eligibleIds[Number(match[1])] : undefined;
        return ttsId ? `${item.path}: ${item.reason} (${ttsId})` : `${item.path}: ${item.reason}`;
      })
      .filter(Boolean)
      .join(", ");
    if (fields) {
      return `${error.message} [${fields}]`;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export async function analyzeTtsPageWithLlm(serverEnv: ServerEnv, input: unknown) {
  const runStartedAt = performance.now();
  const startedAt = new Date().toISOString();
  const runId = randomUUID();
  const logFile = getLogFile(runId, startedAt);
  const config = getOpenRouterConfig(serverEnv);
  const request = ttsLlmAnalysisRequestSchema.parse(input);
  let stage: RunStage = "prepare";
  let stageStartedAt = runStartedAt;
  let baselineItems: G2pItem[] = [];
  let promptItems: OpenRouterPromptItem[] = [];
  let openRouterResult: Awaited<ReturnType<typeof requestOpenRouterCorrections>> | undefined;
  let validateRequest: Array<{ text: string; kana: string }> = [];
  let validatedItems: G2pItem[] = [];
  let results: TtsLlmAnalysisResponse["items"] = [];
  const timings = {
    haqumeiBaselineMs: 0,
    openRouterMs: 0,
    haqumeiValidationMs: 0,
    totalMs: 0,
  };

  try {
    const eligible = request.items
      .map((item) => ({ ...item, effectiveText: getEffectiveReadText(item) }))
      .filter((item) => item.provider !== "voicepeak" && item.effectiveText);

    if (eligible.length > 0) {
      assertHaqumeiValidateBatch(eligible.map((item) => item.effectiveText));

      stage = "haqumei-baseline";
      stageStartedAt = performance.now();
      baselineItems = await analyzeTexts(
        serverEnv,
        eligible.map((item) => item.effectiveText),
      );
      timings.haqumeiBaselineMs = elapsedMs(stageStartedAt);

      promptItems = eligible.map((item, index) => ({
        id: item.id,
        text: item.text,
        readText: item.effectiveText,
        kana: baselineItems[index]!.kana,
      }));

      stage = "openrouter";
      stageStartedAt = performance.now();
      openRouterResult = await requestOpenRouterCorrections(serverEnv, promptItems);
      timings.openRouterMs = elapsedMs(stageStartedAt);

      validateRequest = eligible.map((item, index) => ({
        text: item.effectiveText,
        kana: openRouterResult!.corrections[index]!.kana,
      }));

      stage = "haqumei-validate";
      stageStartedAt = performance.now();
      validatedItems = await validateG2pItems(serverEnv, validateRequest);
      timings.haqumeiValidationMs = elapsedMs(stageStartedAt);

      const eligibleById = new Map(eligible.map((item, index) => [item.id, { item, index }]));
      results = request.items.map((item) => {
        if (item.provider === "voicepeak") {
          return { id: item.id, status: "skipped" as const, reason: "VoicePeak does not use G2P" };
        }
        const effectiveText = getEffectiveReadText(item);
        if (!effectiveText) {
          return { id: item.id, status: "skipped" as const, reason: "Empty text" };
        }

        const entry = eligibleById.get(item.id)!;
        const baseline = baselineItems[entry.index]!;
        const correction = openRouterResult!.corrections[entry.index]!;
        const g2p = validatedItems[entry.index]!;
        return {
          id: item.id,
          status: g2p.kana === baseline.kana ? ("unchanged" as const) : ("corrected" as const),
          baselineKana: baseline.kana,
          correctedKana: g2p.kana,
          reason: correction.reason || undefined,
          g2p,
        };
      });
    } else {
      results = request.items.map((item) => ({
        id: item.id,
        status: "skipped" as const,
        reason: item.provider === "voicepeak" ? "VoicePeak does not use G2P" : "Empty text",
      }));
    }

    timings.totalMs = elapsedMs(runStartedAt);
    const usage = openRouterResult?.usage ?? ZERO_USAGE;
    const analyzedCount = results.filter((item) => item.status !== "skipped").length;
    const response = ttsLlmAnalysisResponseSchema.parse({
      runId,
      logFile,
      requestId: openRouterResult?.requestId,
      model: openRouterResult?.model ?? config.model,
      provider: config.provider,
      actualProvider: openRouterResult?.actualProvider,
      timings,
      usage,
      costPerTtsUsd: analyzedCount ? usage.costUsd / analyzedCount : 0,
      monthlyUsdAt3000Tts: analyzedCount ? (usage.costUsd / analyzedCount) * 3000 : 0,
      items: results,
    });

    stage = "log";
    await writeRunLog(logFile, {
      status: "success",
      runId,
      startedAt,
      request,
      timings,
      baselineItems,
      promptItems,
      openRouter: openRouterResult,
      validateRequest,
      validatedItems,
      response,
    });
    console.info(
      `[llm-g2p] ${runId} items=${analyzedCount} total=${timings.totalMs}ms cost=$${usage.costUsd} log=${logFile}`,
    );
    return response;
  } catch (error) {
    if (stage === "haqumei-baseline" && timings.haqumeiBaselineMs === 0) {
      timings.haqumeiBaselineMs = elapsedMs(stageStartedAt);
    } else if (stage === "openrouter" && timings.openRouterMs === 0) {
      timings.openRouterMs = elapsedMs(stageStartedAt);
    } else if (stage === "haqumei-validate" && timings.haqumeiValidationMs === 0) {
      timings.haqumeiValidationMs = elapsedMs(stageStartedAt);
    }
    timings.totalMs = elapsedMs(runStartedAt);
    const eligibleIds = request.items
      .filter((item) => item.provider !== "voicepeak" && getEffectiveReadText(item))
      .map((item) => item.id);
    const failure = {
      status: "failure",
      runId,
      startedAt,
      stage,
      request,
      timings,
      baselineItems,
      promptItems,
      openRouter: openRouterResult,
      validateRequest,
      validatedItems,
      results,
      limits: {
        maxItems: HAQUMEI_MAX_BATCH_SIZE,
        maxTextChars: HAQUMEI_MAX_TEXT_CHARS,
        maxTotalChars: HAQUMEI_MAX_TOTAL_CHARS,
        itemCount: eligibleIds.length,
      },
      error: serializeError(error),
    };
    try {
      await writeRunLog(logFile, failure);
    } catch (logError) {
      console.error(`[llm-g2p] ${runId} failed to write log:`, logError);
    }
    console.error(
      `[llm-g2p] ${runId} failed stage=${stage} total=${timings.totalMs}ms log=${logFile}`,
    );
    throw new Error(`[${runId}] ${formatPipelineError(error, eligibleIds)} (log: ${logFile})`, {
      cause: error,
    });
  }
}
