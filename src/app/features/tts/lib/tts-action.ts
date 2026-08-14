import type { DraftTts } from "@/_schemas";

function hasText(item: DraftTts) {
  return Boolean((item.text ?? "").trim());
}

function hasVoiceName(item: DraftTts) {
  return Boolean(item.voiceName);
}

export function isTtsActionReady(item: DraftTts | undefined, canRunTts: boolean): item is DraftTts {
  if (!item || !canRunTts) {
    return false;
  }

  return hasText(item) && hasVoiceName(item);
}
