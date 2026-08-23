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
  OpenRouterValidationError,
  requestOpenRouterCorrections,
  type OpenRouterCorrection,
  type OpenRouterPromptItem,
  type OpenRouterRepairItem,
  type OpenRouterUsage,
  type OpenRouterValidationIssue,
  type ReasoningEffort,
  type StructuredCorrection,
} from "./openrouter";
import { getEffectiveReadText } from "./providers/comparison";

type RunStage = "prepare" | "haqumei-baseline" | "openrouter" | "haqumei-validate" | "log";

const ZERO_USAGE: OpenRouterUsage = {
  promptTokens: 0,
  completionTokens: 0,
  reasoningTokens: 0,
  cachedTokens: 0,
  totalTokens: 0,
  costUsd: 0,
};

type AttemptLog = {
  attempt: 1 | 2;
  requestId?: string;
  model: string;
  provider?: string;
  reasoningEffort: ReasoningEffort;
  finishReason?: string;
  structuredOutput?: StructuredCorrection[];
  renderedKana?: string[];
  validationErrors?: OpenRouterValidationIssue[];
  timings: {
    openRouterMs: number;
    validationMs: number;
  };
  usage: OpenRouterUsage;
};

function elapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

function addUsage(left: OpenRouterUsage, right: OpenRouterUsage): OpenRouterUsage {
  return {
    promptTokens: left.promptTokens + right.promptTokens,
    completionTokens: left.completionTokens + right.completionTokens,
    reasoningTokens: left.reasoningTokens + right.reasoningTokens,
    cachedTokens: left.cachedTokens + right.cachedTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    costUsd: left.costUsd + right.costUsd,
  };
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
  if (error instanceof OpenRouterValidationError) {
    return {
      name: error.name,
      message: error.message,
      validationErrors: error.validationErrors,
      finishReason: error.finishReason,
    };
  }
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

function formatValidationIssues(issues: OpenRouterValidationIssue[]) {
  return issues
    .map((item) =>
      item.ttsId ? `${item.path}: ${item.reason} (${item.ttsId})` : `${item.path}: ${item.reason}`,
    )
    .join(", ");
}

function formatPipelineError(error: unknown, eligibleIds: string[]) {
  if (error instanceof OpenRouterValidationError) {
    const fields = formatValidationIssues(error.validationErrors);
    return fields ? `${error.message} [${fields}]` : error.message;
  }
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

function isRetryableAiError(error: unknown) {
  if (error instanceof OpenRouterValidationError) return true;
  return error instanceof HaqumeiApiError && error.status === 422;
}

function failedIndexesFromHaqumei(error: HaqumeiApiError, itemCount: number) {
  const indexes = new Set<number>();
  for (const item of error.errors) {
    const match = /^items\[(\d+)\]/u.exec(item.path);
    if (!match) continue;
    const index = Number(match[1]);
    if (Number.isInteger(index) && index >= 0 && index < itemCount) {
      indexes.add(index);
    }
  }
  return indexes.size > 0 ? [...indexes] : Array.from({ length: itemCount }, (_, index) => index);
}

function haqumeiValidationErrors(
  error: HaqumeiApiError,
  promptItems: OpenRouterPromptItem[],
): OpenRouterValidationIssue[] {
  return error.errors.map((item) => {
    const match = /^items\[(\d+)\]/u.exec(item.path);
    const ttsId = match ? promptItems[Number(match[1])]?.id : undefined;
    return { path: item.path, reason: item.reason, ttsId };
  });
}

function repairItemsForIndexes(
  indexes: number[],
  promptItems: OpenRouterPromptItem[],
  corrections: OpenRouterCorrection[],
  structuredOutput: StructuredCorrection[] | undefined,
  validationErrors: OpenRouterValidationIssue[],
): OpenRouterRepairItem[] {
  return indexes.map((index) => {
    const item = promptItems[index]!;
    const errors = validationErrors.filter(
      (error) => error.ttsId === item.id || error.path.startsWith(`items[${index}]`),
    );
    return {
      id: item.id,
      baselineKana: item.kana,
      previousCorrection: structuredOutput?.find((correction) => correction.id === item.id) ?? {},
      renderedKana: corrections[index]?.kana ?? "",
      validationErrors: errors.length > 0 ? errors : validationErrors,
    };
  });
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
  let openRouterAttempts: AttemptLog[] = [];
  let validateRequest: Array<{ text: string; kana: string }> = [];
  let validatedItems: G2pItem[] = [];
  let results: TtsLlmAnalysisResponse["items"] = [];
  let mergedCorrections: OpenRouterCorrection[] = [];
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

      let pendingItems = promptItems;
      let repairItems: OpenRouterRepairItem[] | undefined;
      mergedCorrections = [];

      for (const attempt of [1, 2] as const) {
        const reasoningEffort: ReasoningEffort = attempt === 1 ? "low" : "medium";
        stage = "openrouter";
        stageStartedAt = performance.now();
        let openRouterResult: Awaited<ReturnType<typeof requestOpenRouterCorrections>>;
        try {
          openRouterResult = await requestOpenRouterCorrections(serverEnv, pendingItems, {
            reasoningEffort,
            repairItems,
          });
        } catch (error) {
          const openRouterMs = elapsedMs(stageStartedAt);
          timings.openRouterMs += openRouterMs;
          if (error instanceof OpenRouterValidationError) {
            openRouterAttempts.push({
              attempt,
              requestId: error.requestId,
              model: error.model,
              provider: error.provider,
              reasoningEffort,
              finishReason: error.finishReason,
              structuredOutput: error.structuredOutput,
              renderedKana: error.renderedKana,
              validationErrors: error.validationErrors,
              timings: { openRouterMs, validationMs: 0 },
              usage: error.usage,
            });
            if (attempt === 1 && isRetryableAiError(error)) {
              pendingItems = promptItems;
              repairItems = repairItemsForIndexes(
                promptItems.map((_, index) => index),
                promptItems,
                mergedCorrections,
                error.structuredOutput,
                error.validationErrors,
              );
              continue;
            }
          }
          throw error;
        }

        const openRouterMs = elapsedMs(stageStartedAt);
        timings.openRouterMs += openRouterMs;

        if (attempt === 1) {
          mergedCorrections = openRouterResult.corrections;
        } else {
          for (const correction of openRouterResult.corrections) {
            const index = promptItems.findIndex((item) => item.id === correction.id);
            if (index >= 0) mergedCorrections[index] = correction;
          }
        }

        validateRequest = eligible.map((item, index) => ({
          text: item.effectiveText,
          kana: mergedCorrections[index]!.kana,
        }));

        stage = "haqumei-validate";
        stageStartedAt = performance.now();
        try {
          validatedItems = await validateG2pItems(serverEnv, validateRequest);
          const validationMs = elapsedMs(stageStartedAt);
          timings.haqumeiValidationMs += validationMs;
          openRouterAttempts.push({
            attempt,
            requestId: openRouterResult.requestId,
            model: openRouterResult.model,
            provider: openRouterResult.actualProvider,
            reasoningEffort,
            finishReason: openRouterResult.finishReason,
            structuredOutput: openRouterResult.structuredOutput,
            renderedKana: openRouterResult.renderedKana,
            timings: { openRouterMs, validationMs },
            usage: openRouterResult.usage,
          });
          break;
        } catch (error) {
          const validationMs = elapsedMs(stageStartedAt);
          timings.haqumeiValidationMs += validationMs;
          const validationErrors =
            error instanceof HaqumeiApiError
              ? haqumeiValidationErrors(error, promptItems)
              : undefined;
          openRouterAttempts.push({
            attempt,
            requestId: openRouterResult.requestId,
            model: openRouterResult.model,
            provider: openRouterResult.actualProvider,
            reasoningEffort,
            finishReason: openRouterResult.finishReason,
            structuredOutput: openRouterResult.structuredOutput,
            renderedKana: openRouterResult.renderedKana,
            validationErrors,
            timings: { openRouterMs, validationMs },
            usage: openRouterResult.usage,
          });
          if (attempt === 1 && error instanceof HaqumeiApiError && error.status === 422) {
            const failedIndexes = failedIndexesFromHaqumei(error, promptItems.length);
            pendingItems = failedIndexes.map((index) => promptItems[index]!);
            repairItems = repairItemsForIndexes(
              failedIndexes,
              promptItems,
              mergedCorrections,
              openRouterResult.structuredOutput,
              validationErrors ?? [],
            );
            continue;
          }
          throw error;
        }
      }

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
        const correction = mergedCorrections[entry.index]!;
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
    const usage = openRouterAttempts.reduce(
      (sum, attempt) => addUsage(sum, attempt.usage),
      ZERO_USAGE,
    );
    const lastAttempt = openRouterAttempts.at(-1);
    const analyzedCount = results.filter((item) => item.status !== "skipped").length;
    const response = ttsLlmAnalysisResponseSchema.parse({
      runId,
      logFile,
      requestId: lastAttempt?.requestId,
      model: lastAttempt?.model ?? config.model,
      provider: config.provider,
      actualProvider: lastAttempt?.provider,
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
      openRouter: openRouterAttempts,
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
      openRouter: openRouterAttempts,
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
