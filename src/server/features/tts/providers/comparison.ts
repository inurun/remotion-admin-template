import { g2pItemSchema, type G2pItem } from "@/_schemas";
import type {
  TtsInputForProvider,
  SavedTtsForProvider,
  TtsComparisonInput,
  TtsProvider,
} from "@/server/features/tts/providers/types";

export function getEffectiveReadText(
  item: Pick<TtsInputForProvider<TtsProvider>, "text" | "readText">,
) {
  return item.readText?.trim() || item.text;
}

export function getOptionalVoiceVersion(value: string) {
  return value || undefined;
}

function normalizeOptionalString(value?: string) {
  return value ?? "";
}

function normalizeSynthesisSettings<TSettings>(value: TSettings | null | undefined) {
  return value ?? undefined;
}

export function getUsableG2p(g2p: unknown, readText: string): G2pItem | undefined {
  const parsed = g2pItemSchema.safeParse(g2p);
  if (!parsed.success || parsed.data.text !== readText) {
    return undefined;
  }

  return parsed.data;
}

export function createDraftComparisonInput<TProvider extends TtsProvider>(
  provider: TProvider,
  item: TtsInputForProvider<TProvider>,
  readText: string,
): TtsComparisonInput<TProvider> {
  return {
    provider,
    text: item.text,
    readText,
    voiceName: item.voiceName?.trim() || "",
    voiceVersion: item.voiceVersion?.trim() || "",
    ...(item.speech?.g2p ? { g2p: item.speech.g2p } : {}),
    synthesisSettings: normalizeSynthesisSettings(item.synthesisSettings),
  };
}

export function createPreviousComparisonInput<TProvider extends TtsProvider>(
  provider: TProvider,
  item: SavedTtsForProvider<TProvider>,
): TtsComparisonInput<TProvider> {
  return {
    provider,
    text: item.text,
    readText: normalizeOptionalString(item.readText),
    voiceName: normalizeOptionalString(item.voiceName),
    voiceVersion: normalizeOptionalString(item.voiceVersion),
    ...(item.speech.g2p ? { g2p: item.speech.g2p } : {}),
    synthesisSettings: normalizeSynthesisSettings(item.synthesisSettings),
  };
}
