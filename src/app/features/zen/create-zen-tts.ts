import type { VoiceOption } from "@/_schemas";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import {
  getAvatarTypeByVoiceName,
  resolveAvatarSettings,
} from "@/_shared/lib/avatar/avatar-settings";
import { createTtsInput } from "@/app/features/tts";
import type { ZenAliasTarget } from "@/app/features/zen/types";

export function createZenTts(
  options: VoiceOption[],
  target: ZenAliasTarget,
  text: string,
  eyes: string | undefined,
): TtsFormValues {
  const draft = createTtsInput(options, undefined);
  const avatarType = getAvatarTypeByVoiceName(target.voice.voiceName);
  const avatar = resolveAvatarSettings(
    avatarType,
    eyes ? { base: "", eyes, mouth: "" } : undefined,
  );

  return {
    ...draft,
    provider: target.voice.provider,
    voiceName: target.voice.voiceName,
    voiceVersion: target.voice.voiceVersion ?? "",
    text,
    readText: text,
    avatar,
    synthesisSettings: null,
  } as TtsFormValues;
}
