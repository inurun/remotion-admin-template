import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { G2pItem } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import { HaqumeiApiError } from "@/server/features/haqumei-api/error";
import {
  contextForChunk,
  type AutomaticG2pPageContext,
} from "@/server/features/tts/automatic-g2p-context";
import {
  classifyCorrection,
  toRepairItem,
  validateReadyKana,
} from "@/server/features/tts/g2p-correction";
import type { CorrectionError } from "@/server/features/tts/g2p-topology";
import { remountG2pKana } from "@/server/features/tts/g2p-topology";
import { AUTOMATIC_LLM_G2P_PROFILE, chunkItems } from "@/server/features/tts/llm-g2p-profile";
import {
  OpenRouterError,
  OpenRouterValidationError,
  requestOpenRouterCorrections,
  type OpenRouterCorrection,
  type OpenRouterPromptItem,
  type OpenRouterRepairItem,
} from "@/server/features/tts/openrouter";

export type AutomaticAnalyzeTarget = {
  pageId: string;
  ttsId: string;
  analysisKey: string;
  text: string;
  readText: string;
  baseline: G2pItem;
};

export type AutomaticG2pBatchResult = {
  fallback: boolean;
  reason?: string;
  g2pByTtsId: Map<string, G2pItem>;
  log: Record<string, unknown>;
};

function elapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

function serializeError(error: unknown) {
  if (error instanceof OpenRouterValidationError) {
    return {
      name: error.name,
      message: error.message,
      validationErrors: error.validationErrors,
      finishReason: error.finishReason,
      usage: error.usage,
      structuredOutput: error.structuredOutput,
      renderedKana: error.renderedKana,
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
    return { name: error.name, message: error.message };
  }
  return { message: String(error) };
}

function getLogFile(runId: string, startedAt: string) {
  const fileName = `${startedAt.replaceAll(":", "-").replaceAll(".", "-")}-${runId}.json`;
  return path.join(".logs", "llm-g2p", "automatic", fileName);
}

async function writeRunLog(logFile: string, value: unknown) {
  const absolutePath = path.join(process.cwd(), logFile);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function baselineMap(targets: AutomaticAnalyzeTarget[]) {
  return new Map(targets.map((target) => [target.ttsId, target.baseline]));
}

function sanitizeReason(reason: string) {
  return reason.replace(/\s+/g, " ").trim().slice(0, 500);
}

type ItemOutcome = {
  ttsId: string;
  applied: "corrected" | "unchanged" | "baseline";
  reason?: string;
  remounted?: boolean;
};

type TargetPrompt = {
  target: AutomaticAnalyzeTarget;
  promptItem: OpenRouterPromptItem;
};

function promptForTarget(target: AutomaticAnalyzeTarget): OpenRouterPromptItem {
  return {
    id: target.ttsId,
    text: target.text,
    readText: target.readText,
    kana: target.baseline.kana,
  };
}

async function applyCorrections(input: {
  serverEnv: ServerEnv;
  targets: TargetPrompt[];
  corrections: OpenRouterCorrection[];
  settled: Map<string, ItemOutcome>;
  g2pByTtsId: Map<string, G2pItem>;
}) {
  const correctionById = new Map(input.corrections.map((item) => [item.id, item]));
  const ready: Array<{
    target: AutomaticAnalyzeTarget;
    kana: string;
    reason?: string;
    remounted?: boolean;
  }> = [];
  const repairs: Array<{
    target: AutomaticAnalyzeTarget;
    promptItem: OpenRouterPromptItem;
    previousKana: string;
    errors: CorrectionError[];
    reason?: string;
  }> = [];

  for (const item of input.targets) {
    if (input.settled.has(item.target.ttsId)) {
      continue;
    }

    const classified = classifyCorrection(
      item.promptItem,
      correctionById.get(item.target.ttsId),
      true,
    );
    if (classified.status === "unchanged") {
      input.g2pByTtsId.set(item.target.ttsId, item.target.baseline);
      input.settled.set(item.target.ttsId, { ttsId: item.target.ttsId, applied: "unchanged" });
      continue;
    }
    if (classified.status === "repair") {
      const remounted = remountG2pKana(item.target.baseline.kana, classified.previousKana);
      if (remounted) {
        if (remounted === item.target.baseline.kana) {
          input.g2pByTtsId.set(item.target.ttsId, item.target.baseline);
          input.settled.set(item.target.ttsId, {
            ttsId: item.target.ttsId,
            applied: "unchanged",
            remounted: true,
          });
          continue;
        }
        ready.push({
          target: item.target,
          kana: remounted,
          reason: classified.reason,
          remounted: true,
        });
        continue;
      }
      repairs.push({
        target: item.target,
        promptItem: item.promptItem,
        previousKana: classified.previousKana,
        errors: classified.errors,
        reason: classified.reason,
      });
      continue;
    }

    ready.push({ target: item.target, kana: classified.kana, reason: classified.reason });
  }

  const validated = await validateReadyKana(
    input.serverEnv,
    ready.map((item) => ({
      id: item.target.ttsId,
      text: item.target.readText,
      kana: item.kana,
    })),
  );

  for (const item of ready) {
    const g2p = validated.ok.get(item.target.ttsId);
    if (g2p) {
      input.g2pByTtsId.set(item.target.ttsId, g2p);
      input.settled.set(item.target.ttsId, {
        ttsId: item.target.ttsId,
        applied: "corrected",
        ...(item.reason ? { reason: item.reason } : {}),
        ...(item.remounted ? { remounted: true } : {}),
      });
      continue;
    }

    const error = validated.failed.get(item.target.ttsId);
    repairs.push({
      target: item.target,
      promptItem: promptForTarget(item.target),
      previousKana: item.kana,
      errors: [error ?? { kind: "validate", message: "haqumei validate failed" }],
      reason: item.reason,
    });
  }

  return {
    repairs,
    haqumeiValidate: {
      ok: validated.failed.size === 0,
      passedIds: [...validated.ok.keys()],
      failed: [...validated.failed.entries()],
    },
  };
}

function fallbackRemaining(
  remaining: TargetPrompt[],
  settled: Map<string, ItemOutcome>,
  g2pByTtsId: Map<string, G2pItem>,
  reason: string,
) {
  for (const item of remaining) {
    if (settled.has(item.target.ttsId)) {
      continue;
    }
    g2pByTtsId.set(item.target.ttsId, item.target.baseline);
    settled.set(item.target.ttsId, {
      ttsId: item.target.ttsId,
      applied: "baseline",
      reason,
    });
  }
}

function fallbackRepairs(
  remaining: Array<{
    target: AutomaticAnalyzeTarget;
    promptItem: OpenRouterPromptItem;
    errors: CorrectionError[];
  }>,
  settled: Map<string, ItemOutcome>,
  g2pByTtsId: Map<string, G2pItem>,
) {
  for (const item of remaining) {
    fallbackRemaining(
      [{ target: item.target, promptItem: item.promptItem }],
      settled,
      g2pByTtsId,
      item.errors.map((error) => error.message).join("; ") || "repair still failed",
    );
  }
}

function resultStatus(outcomes: ItemOutcome[]) {
  const corrected = outcomes.some((item) => item.applied === "corrected");
  const failed = outcomes.some((item) => item.applied === "baseline");
  if (corrected && failed) {
    return "partial";
  }
  if (failed) {
    return "fallback";
  }
  return "success";
}

export async function runAutomaticG2pBatch(
  serverEnv: ServerEnv,
  input: {
    pages: AutomaticG2pPageContext[];
    targets: AutomaticAnalyzeTarget[];
  },
): Promise<AutomaticG2pBatchResult> {
  const runStartedAt = performance.now();
  const startedAt = new Date().toISOString();
  const runId = randomUUID();
  const logFile = getLogFile(runId, startedAt);
  const profile = AUTOMATIC_LLM_G2P_PROFILE;
  const baselines = baselineMap(input.targets);
  const targetPrompts: TargetPrompt[] = input.targets.map((target) => ({
    target,
    promptItem: promptForTarget(target),
  }));

  const log: Record<string, unknown> = {
    status: "success",
    mode: profile.mode,
    profileId: profile.id,
    runId,
    startedAt,
    logFile,
    analysisKeys: input.targets.map((target) => ({
      pageId: target.pageId,
      ttsId: target.ttsId,
      analysisKey: target.analysisKey,
    })),
    inputContext: input.pages,
    baseline: input.targets.map((target) => ({
      id: target.ttsId,
      kana: target.baseline.kana,
    })),
    profile: {
      model: profile.model,
      provider: profile.provider,
      reasoningEffort: profile.reasoningEffort,
      timeoutMs: profile.timeoutMs,
      chunkSize: profile.chunkSize,
    },
  };

  const finish = async (
    result: Omit<AutomaticG2pBatchResult, "log">,
    extra?: Record<string, unknown>,
  ) => {
    log.fallback = result.fallback;
    if (result.reason) {
      log.reason = sanitizeReason(result.reason);
    }
    const extraTimings =
      extra?.timings && typeof extra.timings === "object" && extra.timings !== null
        ? extra.timings
        : {};
    log.timings = { totalMs: elapsedMs(runStartedAt), ...extraTimings };
    Object.assign(log, extra);
    if (typeof extra?.status === "string") {
      log.status = extra.status;
    } else {
      log.status = result.fallback ? "fallback" : "success";
    }
    try {
      await writeRunLog(logFile, log);
    } catch (error) {
      console.error(`[llm-g2p] ${runId} failed to write automatic log:`, error);
    }
    console.info(
      `[llm-g2p] automatic ${runId} targets=${input.targets.length} fallback=${result.fallback} total=${elapsedMs(runStartedAt)}ms log=${logFile}`,
    );
    return { ...result, log };
  };

  const g2pByTtsId = new Map<string, G2pItem>();
  const settled = new Map<string, ItemOutcome>();
  const openRouterAttempts: Array<Record<string, unknown>> = [];
  let openRouterMs = 0;
  let validationMs = 0;
  const haqumeiValidate: unknown[] = [];
  const repairs: Array<{
    target: AutomaticAnalyzeTarget;
    promptItem: OpenRouterPromptItem;
    previousKana: string;
    errors: CorrectionError[];
    reason?: string;
  }> = [];

  const logOpenRouter = (
    attempt: 1 | 2,
    chunkIndex: number,
    result: Awaited<ReturnType<typeof requestOpenRouterCorrections>>,
    extra?: Record<string, unknown>,
  ) => {
    openRouterAttempts.push({
      attempt,
      chunk: chunkIndex,
      requestId: result.requestId,
      model: result.model,
      actualProvider: result.actualProvider,
      reasoningEffort: result.reasoningEffort,
      finishReason: result.finishReason,
      structuredOutput: result.structuredOutput,
      renderedKana: result.renderedKana,
      usage: result.usage,
      ...("partialErrors" in result &&
      Array.isArray(result.partialErrors) &&
      result.partialErrors.length > 0
        ? { partialErrors: result.partialErrors }
        : {}),
      ...extra,
    });
  };

  try {
    const targetChunks = chunkItems(targetPrompts, profile.chunkSize);
    for (const [chunkIndex, chunk] of targetChunks.entries()) {
      try {
        const firstStartedAt = performance.now();
        const firstResult = await requestOpenRouterCorrections(
          serverEnv,
          chunk.map((item) => item.promptItem),
          {
            profile,
            userContent: {
              pages: contextForChunk(input.pages, new Set(chunk.map((item) => item.target.ttsId))),
            },
          },
        );
        openRouterMs += elapsedMs(firstStartedAt);
        logOpenRouter(1, chunkIndex, firstResult);

        const firstValidateStartedAt = performance.now();
        const firstPass = await applyCorrections({
          serverEnv,
          targets: chunk,
          corrections: firstResult.corrections,
          settled,
          g2pByTtsId,
        });
        validationMs += elapsedMs(firstValidateStartedAt);
        haqumeiValidate.push({ attempt: 1, chunk: chunkIndex, ...firstPass.haqumeiValidate });
        repairs.push(...firstPass.repairs);
      } catch (error) {
        openRouterAttempts.push({
          attempt: 1,
          chunk: chunkIndex,
          error: serializeError(error),
        });
        fallbackRemaining(
          chunk,
          settled,
          g2pByTtsId,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    if (repairs.length > 0 && profile.maxAttempts > 1) {
      for (const [chunkIndex, repairChunk] of chunkItems(repairs, profile.chunkSize).entries()) {
        const repairItems: OpenRouterRepairItem[] = repairChunk.map((item) =>
          toRepairItem(item.promptItem, item.previousKana, item.errors),
        );
        try {
          const repairStartedAt = performance.now();
          const repairResult = await requestOpenRouterCorrections(
            serverEnv,
            repairChunk.map((item) => item.promptItem),
            {
              profile,
              repairItems,
            },
          );
          openRouterMs += elapsedMs(repairStartedAt);
          logOpenRouter(2, chunkIndex, repairResult, { repairItems });

          const repairValidateStartedAt = performance.now();
          const secondPass = await applyCorrections({
            serverEnv,
            targets: repairChunk.map((item) => ({
              target: item.target,
              promptItem: item.promptItem,
            })),
            corrections: repairResult.corrections,
            settled,
            g2pByTtsId,
          });
          validationMs += elapsedMs(repairValidateStartedAt);
          haqumeiValidate.push({ attempt: 2, chunk: chunkIndex, ...secondPass.haqumeiValidate });
          fallbackRepairs(secondPass.repairs, settled, g2pByTtsId);
        } catch (error) {
          openRouterAttempts.push({
            attempt: 2,
            chunk: chunkIndex,
            error: serializeError(error),
          });
          fallbackRemaining(
            repairChunk.map((item) => ({
              target: item.target,
              promptItem: item.promptItem,
            })),
            settled,
            g2pByTtsId,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    } else {
      fallbackRepairs(repairs, settled, g2pByTtsId);
    }

    for (const target of input.targets) {
      if (!g2pByTtsId.has(target.ttsId)) {
        g2pByTtsId.set(target.ttsId, target.baseline);
        settled.set(target.ttsId, {
          ttsId: target.ttsId,
          applied: "baseline",
          reason: "missing structured output",
        });
      }
    }

    const outcomes = input.targets.map(
      (target) =>
        settled.get(target.ttsId) ?? {
          ttsId: target.ttsId,
          applied: "baseline" as const,
          reason: "missing structured output",
        },
    );
    const status = resultStatus(outcomes);
    const failed = outcomes.filter((item) => item.applied === "baseline");

    return finish(
      {
        fallback: status === "fallback",
        reason:
          failed
            .map((item) => item.reason)
            .filter(Boolean)
            .join("; ") || undefined,
        g2pByTtsId,
      },
      {
        status,
        items: outcomes,
        openRouter: openRouterAttempts,
        haqumeiValidate,
        timings: { openRouterMs, validationMs },
      },
    );
  } catch (error) {
    log.error = serializeError(error);
    return finish({
      fallback: true,
      reason: error instanceof Error ? error.message : String(error),
      g2pByTtsId: baselines,
    });
  }
}
