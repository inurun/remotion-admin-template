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
