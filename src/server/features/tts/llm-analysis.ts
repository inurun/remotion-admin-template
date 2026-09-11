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
import {
  ttsLlmAnalysisRequestSchema,
  ttsLlmAnalysisResponseSchema,
  type TtsLlmAnalysisResponse,
} from "./contract";
import { MANUAL_LLM_G2P_PROFILE } from "@/server/features/tts/llm-g2p-profile";
import { classifyCorrection, toRepairItem, validateReadyKana } from "./g2p-correction";
import type { CorrectionError } from "./g2p-topology";
import {
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
  rawResponse?: unknown;
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

function getLogFile(mode: "automatic" | "manual", runId: string, startedAt: string) {
  const fileName = `${startedAt.replaceAll(":", "-").replaceAll(".", "-")}-${runId}.json`;
  return path.join(".logs", "llm-g2p", mode, fileName);
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
      rawResponse: error.rawResponse,
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
        return ttsId
          ? `${item.path}: ${item.message ?? item.reason} (${ttsId})`
          : `${item.path}: ${item.message ?? item.reason}`;
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
  return error instanceof OpenRouterValidationError;
}

function throwRemainingRepairs(
  repairs: Array<{ promptItem: OpenRouterPromptItem; errors: CorrectionError[] }>,
) {
  const message = repairs
    .map((item) =>
      item.errors
        .map((error) => `${error.kind}: ${error.message} (${item.promptItem.id})`)
        .join(", "),
    )
    .filter(Boolean)
    .join(", ");
  throw new Error(message || "LLM G2P repair failed");
}

export async function analyzeTtsPageWithLlm(serverEnv: ServerEnv, input: unknown) {
  const runStartedAt = performance.now();
  const startedAt = new Date().toISOString();
  const runId = randomUUID();
  const logFile = getLogFile("manual", runId, startedAt);
  const profile = MANUAL_LLM_G2P_PROFILE;
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
        ...(item.previous ? { previous: item.previous } : {}),
        ...(item.next ? { next: item.next } : {}),
      }));

      const baselineById = new Map(
        eligible.map((item, index) => [item.id, baselineItems[index]!] as const),
      );
      const g2pById = new Map<string, G2pItem>();
      const settledIds = new Set<string>();
      let pendingItems = promptItems;
      let repairItems: OpenRouterRepairItem[] | undefined;
      mergedCorrections = promptItems.map((item) => ({
        id: item.id,
        changed: false,
        kana: item.kana,
        reason: "",
      }));

      for (const attempt of [1, 2] as const) {
        const reasoningEffort: ReasoningEffort = profile.reasoningEffort;
        stage = "openrouter";
        stageStartedAt = performance.now();
        let openRouterResult: Awaited<ReturnType<typeof requestOpenRouterCorrections>>;
        try {
          openRouterResult = await requestOpenRouterCorrections(serverEnv, pendingItems, {
            profile,
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
              rawResponse: error.rawResponse,
              timings: { openRouterMs, validationMs: 0 },
              usage: error.usage,
            });
            if (attempt === 1 && isRetryableAiError(error)) {
              pendingItems = promptItems;
              repairItems = undefined;
              continue;
            }
          }
          throw error;
        }

        const openRouterMs = elapsedMs(stageStartedAt);
        timings.openRouterMs += openRouterMs;

        const correctionsById = new Map(mergedCorrections.map((item) => [item.id, item]));
        for (const correction of openRouterResult.corrections) {
          if (settledIds.has(correction.id)) {
            continue;
          }
          correctionsById.set(correction.id, correction);
        }
        mergedCorrections = promptItems.map(
          (item) =>
            correctionsById.get(item.id) ?? {
              id: item.id,
              changed: false,
              kana: item.kana,
              reason: "",
            },
        );

        const repairs: Array<{
          promptItem: OpenRouterPromptItem;
          previousKana: string;
          errors: CorrectionError[];
        }> = [];
        const ready: Array<{ promptItem: OpenRouterPromptItem; kana: string }> = [];

        for (const item of pendingItems) {
          const classified = classifyCorrection(item, correctionsById.get(item.id), false);
          if (classified.status === "unchanged") {
            const baseline = baselineById.get(item.id);
            if (baseline) {
              g2pById.set(item.id, baseline);
            }
            settledIds.add(item.id);
            continue;
          }
          if (classified.status === "repair") {
            repairs.push({
              promptItem: item,
              previousKana: classified.previousKana,
              errors: classified.errors,
            });
            continue;
          }
          ready.push({ promptItem: item, kana: classified.kana });
        }

        stage = "haqumei-validate";
        stageStartedAt = performance.now();
        validateRequest = ready.map((item) => ({
          text: item.promptItem.readText,
          kana: item.kana,
        }));
        const validated = await validateReadyKana(
          serverEnv,
          ready.map((item) => ({
            id: item.promptItem.id,
            text: item.promptItem.readText,
            kana: item.kana,
          })),
        );
        const validationMs = elapsedMs(stageStartedAt);
        timings.haqumeiValidationMs += validationMs;

        for (const item of ready) {
          const g2p = validated.ok.get(item.promptItem.id);
          if (g2p) {
            g2pById.set(item.promptItem.id, g2p);
            settledIds.add(item.promptItem.id);
            continue;
          }
          repairs.push({
            promptItem: item.promptItem,
            previousKana: item.kana,
            errors: [
              validated.failed.get(item.promptItem.id) ?? {
                kind: "validate",
                message: "haqumei validate failed",
              },
            ],
          });
        }

        const validationErrors = repairs.flatMap((item) =>
          item.errors.map((error) => ({
            path: `items.${item.promptItem.id}`,
            reason: error.message,
            ttsId: item.promptItem.id,
          })),
        );
        openRouterAttempts.push({
          attempt,
          requestId: openRouterResult.requestId,
          model: openRouterResult.model,
          provider: openRouterResult.actualProvider,
          reasoningEffort,
          finishReason: openRouterResult.finishReason,
          structuredOutput: openRouterResult.structuredOutput,
          renderedKana: openRouterResult.renderedKana,
          ...(validationErrors.length > 0 ? { validationErrors } : {}),
          rawResponse: openRouterResult.rawResponse,
          timings: { openRouterMs, validationMs },
          usage: openRouterResult.usage,
        });

        if (repairs.length === 0) {
          break;
        }
        if (attempt === 1) {
          pendingItems = repairs.map((item) => item.promptItem);
          repairItems = repairs.map((item) =>
            toRepairItem(item.promptItem, item.previousKana, item.errors),
          );
          continue;
        }
        throwRemainingRepairs(repairs);
      }

      validatedItems = promptItems.flatMap((item) => {
        const g2p = g2pById.get(item.id);
        return g2p ? [g2p] : [];
      });
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
        const g2p = g2pById.get(item.id) ?? baseline;
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
      model: lastAttempt?.model ?? profile.model,
      provider: profile.provider.only[0] ?? profile.model,
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
      mode: profile.mode,
      profileId: profile.id,
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
      mode: profile.mode,
      profileId: profile.id,
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
