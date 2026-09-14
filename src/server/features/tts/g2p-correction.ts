import { withLlmDictionaryWords, type G2pItem } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import { HaqumeiApiError, haqumeiReadableError } from "@/server/features/haqumei-api/error";
import { validateG2pItem, validateG2pItems } from "@/server/features/haqumei-api/validate";
import { syntaxOrTopologyErrors, type CorrectionError } from "@/server/features/tts/g2p-topology";
import type {
  OpenRouterCorrection,
  OpenRouterPromptItem,
  OpenRouterRepairItem,
} from "@/server/features/tts/openrouter";

export type ClassifiedCorrection =
  | { status: "unchanged" }
  | { status: "ready"; kana: string; reason?: string }
  | { status: "repair"; previousKana: string; errors: CorrectionError[]; reason?: string };

export function classifyCorrection(
  promptItem: OpenRouterPromptItem,
  correction: OpenRouterCorrection | undefined,
  checkTopology: boolean,
): ClassifiedCorrection {
  if (!correction?.changed) {
    return { status: "unchanged" };
  }

  const errors = syntaxOrTopologyErrors(
    promptItem.kana,
    correction.kana,
    promptItem.id,
    checkTopology,
  );
  if (errors.length > 0) {
    return {
      status: "repair",
      previousKana: correction.kana,
      errors,
      reason: correction.reason || undefined,
    };
  }

  return {
    status: "ready",
    kana: correction.kana,
    reason: correction.reason || undefined,
  };
}

export function toRepairItem(
  promptItem: OpenRouterPromptItem,
  previousKana: string,
  errors: CorrectionError[],
): OpenRouterRepairItem {
  return withLlmDictionaryWords(
    {
      id: promptItem.id,
      text: promptItem.text,
      readText: promptItem.readText,
      baselineKana: promptItem.kana,
      previousKana,
      errors,
    },
    promptItem.dictionaryWords,
  );
}

function validateMessage(error: unknown) {
  if (error instanceof HaqumeiApiError) {
    return haqumeiReadableError(error);
  }
  return error instanceof Error ? error.message : String(error);
}

export async function validateReadyKana(
  serverEnv: ServerEnv,
  items: Array<{ id: string; text: string; kana: string }>,
): Promise<{
  ok: Map<string, G2pItem>;
  failed: Map<string, CorrectionError>;
}> {
  const ok = new Map<string, G2pItem>();
  const failed = new Map<string, CorrectionError>();
  if (items.length === 0) {
    return { ok, failed };
  }

  try {
    const validated = await validateG2pItems(
      serverEnv,
      items.map((item) => ({ text: item.text, kana: item.kana })),
    );
    for (const [index, item] of items.entries()) {
      const g2p = validated[index];
      if (g2p) {
        ok.set(item.id, g2p);
      } else {
        failed.set(item.id, { kind: "validate", message: "haqumei validate returned no item" });
      }
    }
    return { ok, failed };
  } catch (error) {
    if (items.length === 1) {
      const item = items[0]!;
      failed.set(item.id, { kind: "validate", message: validateMessage(error) });
      return { ok, failed };
    }

    for (const item of items) {
      try {
        const g2p = await validateG2pItem(serverEnv, { text: item.text, kana: item.kana });
        ok.set(item.id, g2p);
      } catch (itemError) {
        failed.set(item.id, { kind: "validate", message: validateMessage(itemError) });
      }
    }
    return { ok, failed };
  }
}
