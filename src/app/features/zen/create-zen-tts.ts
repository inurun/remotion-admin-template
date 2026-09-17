import {
  getAvatarTypeForVoice,
  resolveAvatarSettings,
  type AvatarSettings,
  type VoiceOption,
} from "@/_schemas";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { createTtsInput } from "@/app/features/tts";
import { applyTtsVoiceChange } from "@/app/features/tts/lib/apply-tts-voice-change";
import type { ZenAliasTarget } from "@/app/features/zen/types";

export function createZenTts(
  options: VoiceOption[],
  target: ZenAliasTarget,
  text: string,
  avatarSettings: AvatarSettings,
): TtsFormValues {
  const draft = createTtsInput(options, undefined);
  const withVoice = applyTtsVoiceChange(draft, target.voice);
  const avatarType = getAvatarTypeForVoice(target.voice);
  const avatar = resolveAvatarSettings(avatarType, avatarSettings);

  return {
    ...withVoice,
    text,
    readText: text,
    avatar,
    synthesisSettings: null,
  };
}
