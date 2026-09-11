import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { G2pItem } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import { HaqumeiApiError } from "@/server/features/haqumei-api/error";
import { validateG2pItem, validateG2pItems } from "@/server/features/haqumei-api/validate";
import type { AutomaticG2pPageContext } from "@/server/features/tts/automatic-g2p-context";
import { automaticTopologyGuardError } from "@/server/features/tts/g2p-topology";
import { AUTOMATIC_LLM_G2P_PROFILE } from "@/server/features/tts/llm-g2p-profile";
import {
  OpenRouterError,
  OpenRouterValidationError,
  requestOpenRouterCorrections,
  type OpenRouterCorrection,
  type OpenRouterPromptItem,
  type StructuredCorrection,
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
};

function planAutomaticItems(
  targets: AutomaticAnalyzeTarget[],
  structuredOutput: StructuredCorrection[],
  corrections: OpenRouterCorrection[],
) {
  const structuredById = new Map(structuredOutput.map((item) => [item.id, item]));
  const correctionById = new Map(corrections.map((item) => [item.id, item]));

  return targets.map((target) => {
    const structured = structuredById.get(target.ttsId);
    const correction = correctionById.get(target.ttsId);
    if (!structured || !correction) {
      return {
        target,
        kana: target.baseline.kana,
        applied: "baseline" as const,
        reason: "missing structured output",
      };
    }
    if (!correction.changed) {
      return {
        target,
        kana: target.baseline.kana,
        applied: "unchanged" as const,
      };
    }

    const topologyError = automaticTopologyGuardError(target.baseline.kana, structured);
    if (topologyError) {
      return {
        target,
        kana: target.baseline.kana,
        applied: "baseline" as const,
        reason: topologyError,
      };
    }

    return {
      target,
      kana: correction.kana,
      applied: "corrected" as const,
      reason: structured.reason || undefined,
    };
  });
}

async function validatePlannedItems(
  serverEnv: ServerEnv,
  planned: ReturnType<typeof planAutomaticItems>,
) {
  const g2pByTtsId = new Map<string, G2pItem>();
  const outcomes: ItemOutcome[] = [];
  const toValidate = planned.filter((item) => item.applied === "corrected");

  const assignBaseline = (item: (typeof planned)[number], reason: string) => {
    g2pByTtsId.set(item.target.ttsId, item.target.baseline);
    outcomes.push({
      ttsId: item.target.ttsId,
      applied: "baseline",
      reason,
    });
  };

  for (const item of planned) {
    if (item.applied !== "corrected") {
      g2pByTtsId.set(item.target.ttsId, item.target.baseline);
      outcomes.push({
        ttsId: item.target.ttsId,
        applied: item.applied,
        ...(item.reason ? { reason: item.reason } : {}),
      });
    }
  }

  if (toValidate.length === 0) {
    return { g2pByTtsId, outcomes };
  }

  const validateRequest = toValidate.map((item) => ({
    text: item.target.readText,
    kana: item.kana,
  }));

  try {
    const validatedItems = await validateG2pItems(serverEnv, validateRequest);
    for (const [index, item] of toValidate.entries()) {
      g2pByTtsId.set(item.target.ttsId, validatedItems[index] ?? item.target.baseline);
      outcomes.push({
        ttsId: item.target.ttsId,
        applied: validatedItems[index] ? "corrected" : "baseline",
        ...(item.reason ? { reason: item.reason } : {}),
        ...(!validatedItems[index] ? { reason: "haqumei validate returned no item" } : {}),
      });
    }
    return { g2pByTtsId, outcomes, haqumeiValidate: { ok: true, items: validatedItems } };
  } catch (error) {
    const validatedItems: G2pItem[] = [];
    for (const item of toValidate) {
      try {
        const validated = await validateG2pItem(serverEnv, {
          text: item.target.readText,
          kana: item.kana,
        });
        g2pByTtsId.set(item.target.ttsId, validated);
        validatedItems.push(validated);
        outcomes.push({
          ttsId: item.target.ttsId,
          applied: "corrected",
          ...(item.reason ? { reason: item.reason } : {}),
        });
      } catch (itemError) {
        assignBaseline(item, itemError instanceof Error ? itemError.message : String(itemError));
      }
    }
    return {
      g2pByTtsId,
      outcomes,
      haqumeiValidate: {
        ok: false,
        batchError: serializeError(error),
        items: validatedItems,
      },
    };
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
  const promptItems: OpenRouterPromptItem[] = input.targets.map((target) => ({
    id: target.ttsId,
    text: target.text,
    readText: target.readText,
    kana: target.baseline.kana,
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

  try {
    const openRouterStartedAt = performance.now();
    const openRouterResult = await requestOpenRouterCorrections(serverEnv, promptItems, {
      profile,
      userContent: { pages: input.pages },
    });
    const openRouterMs = elapsedMs(openRouterStartedAt);
    log.openRouter = {
      requestId: openRouterResult.requestId,
      model: openRouterResult.model,
      actualProvider: openRouterResult.actualProvider,
      reasoningEffort: openRouterResult.reasoningEffort,
      finishReason: openRouterResult.finishReason,
      structuredOutput: openRouterResult.structuredOutput,
      renderedKana: openRouterResult.renderedKana,
      usage: openRouterResult.usage,
      ...("partialErrors" in openRouterResult &&
      Array.isArray(openRouterResult.partialErrors) &&
      openRouterResult.partialErrors.length > 0
        ? { partialErrors: openRouterResult.partialErrors }
        : {}),
    };

    const planned = planAutomaticItems(
      input.targets,
      openRouterResult.structuredOutput ?? [],
      openRouterResult.corrections,
    );
    const validateStartedAt = performance.now();
    const validated = await validatePlannedItems(serverEnv, planned);
    const validationMs = elapsedMs(validateStartedAt);
    const status = resultStatus(validated.outcomes);
    const failed = validated.outcomes.filter((item) => item.applied === "baseline");

    return finish(
      {
        fallback: status === "fallback",
        reason:
          failed
            .map((item) => item.reason)
            .filter(Boolean)
            .join("; ") || undefined,
        g2pByTtsId: validated.g2pByTtsId,
      },
      {
        status,
        items: validated.outcomes,
        haqumeiValidate: validated.haqumeiValidate,
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
