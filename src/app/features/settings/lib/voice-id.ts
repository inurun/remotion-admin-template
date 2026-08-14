import type { VoiceOption } from "@/_schemas";

export function getVoiceId(voice: Pick<VoiceOption, "provider" | "voiceName" | "voiceVersion">) {
  return `${voice.provider}::${voice.voiceName}::${voice.voiceVersion ?? ""}`;
}
