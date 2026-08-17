import type { VoiceOption } from "@/_schemas";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";

export function applyTtsVoiceChange(
  item: TtsFormValues,
  voice: Pick<VoiceOption, "provider" | "voiceName" | "voiceVersion">,
): TtsFormValues {
  return {
    ...item,
    provider: voice.provider,
    voiceName: voice.voiceName,
    voiceVersion: voice.voiceVersion ?? "",
    synthesisSettings: null,
    speech: {
      ...item.speech,
    },
  } as TtsFormValues;
}
