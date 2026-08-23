import type { VoiceOption } from "@/_schemas";

export function getVoiceId(voice: Pick<VoiceOption, "provider" | "voiceName" | "voiceVersion">) {
  return `${voice.provider}::${voice.voiceName}::${voice.voiceVersion ?? ""}`;
}

export function getVoiceMatchKey(voice: Pick<VoiceOption, "provider" | "voiceName">) {
  return `${voice.provider}::${voice.voiceName}`;
}

export function parseVoiceId(voiceId: string) {
  const [provider, voiceName, voiceVersion = ""] = voiceId.split("::");
  if (!provider || !voiceName) {
    return null;
  }

  return {
    provider: provider as VoiceOption["provider"],
    voiceName,
    voiceVersion,
  };
}
