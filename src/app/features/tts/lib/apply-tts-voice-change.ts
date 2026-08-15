import type { DraftTts, VoiceOption } from "@/_schemas";

export function applyTtsVoiceChange(
  item: DraftTts,
  voice: Pick<VoiceOption, "provider" | "voiceName" | "voiceVersion">,
): DraftTts {
  const providerChanged = item.provider !== voice.provider;

  return {
    ...item,
    provider: voice.provider,
    voiceName: voice.voiceName,
    voiceVersion: voice.voiceVersion ?? "",
    synthesisSettings: null,
    speech: {
      ...item.speech,
      analysis: providerChanged ? "" : (item.speech?.analysis ?? ""),
    },
  } as DraftTts;
}
