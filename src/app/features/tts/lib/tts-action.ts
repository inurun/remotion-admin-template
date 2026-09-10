import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";

function hasText(item: TtsFormValues) {
  return Boolean((item.text ?? "").trim());
}

function hasVoiceName(item: TtsFormValues) {
  return Boolean(item.voiceName);
}

export function isTtsActionReady(
  item: TtsFormValues | undefined,
  canRunTts: boolean,
): item is TtsFormValues {
  if (!item || !canRunTts) {
    return false;
  }

  return hasText(item) && hasVoiceName(item);
}

export function canStartTtsAnalyze(
  item: TtsFormValues | undefined,
  canRunTts: boolean,
  pending: { analyzing: boolean; llmIds: ReadonlySet<string> },
): item is TtsFormValues {
  if (!isTtsActionReady(item, canRunTts) || pending.analyzing) {
    return false;
  }
  return !pending.llmIds.has(item.id);
}

export function canStartTtsLlmAnalyze(
  item: TtsFormValues | undefined,
  canRunTts: boolean,
  pageId: string | null | undefined,
  llmIds: ReadonlySet<string>,
): item is TtsFormValues {
  if (!pageId || !isTtsActionReady(item, canRunTts) || item.provider === "voicepeak") {
    return false;
  }
  return !llmIds.has(item.id);
}
