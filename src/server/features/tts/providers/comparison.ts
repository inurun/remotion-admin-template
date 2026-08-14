import type {
  DraftTtsForProvider,
  SavedTtsForProvider,
  TtsComparisonInput,
  TtsProvider,
} from "@/server/features/tts/providers/types";

function normalizeAnalysis(value?: string) {
  return value?.trim() || "";
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

export function createDraftComparisonInput<TProvider extends TtsProvider>(
  provider: TProvider,
  item: DraftTtsForProvider<TProvider>,
  readText: string,
): TtsComparisonInput<TProvider> {
  return {
    provider,
    text: item.text,
    readText,
    voiceName: item.voiceName?.trim() || "",
    voiceVersion: item.voiceVersion?.trim() || "",
    analysis: normalizeAnalysis(item.speech?.analysis),
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
    analysis: normalizeAnalysis(item.speech.analysis),
    synthesisSettings: normalizeSynthesisSettings(item.synthesisSettings),
  };
}
