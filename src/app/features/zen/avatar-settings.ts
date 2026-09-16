import { avatarOptions, type AvatarSettings, type AvatarType } from "@/_schemas";

const DEFAULT_AVATAR_TYPE: AvatarType = "demo";
const voiceNameAvatarMap: Record<string, AvatarType> = {};

function pickOption<T extends string>(
  options: readonly T[],
  value: string | undefined,
  fallback: T,
) {
  return options.find((option) => option === value) ?? fallback;
}

export function getAvatarTypeByVoiceName(voiceName: string | undefined): AvatarType {
  return voiceName ? (voiceNameAvatarMap[voiceName] ?? DEFAULT_AVATAR_TYPE) : DEFAULT_AVATAR_TYPE;
}

export function getOpenedMouthOptions(type: AvatarType) {
  return avatarOptions[type].mouth.filter((mouth) => mouth.endsWith("opened"));
}

function getDefaultAvatarSettings(type: AvatarType): AvatarSettings {
  const options = avatarOptions[type];
  return {
    base: options.base[0],
    eyes: options.eyes[0],
    mouth: getOpenedMouthOptions(type)[0] ?? options.mouth[0],
  };
}

export function resolveAvatarSettings(
  type: AvatarType,
  value: AvatarSettings | undefined,
): AvatarSettings {
  const options = avatarOptions[type];
  const openedMouthOptions = getOpenedMouthOptions(type);
  const defaults = getDefaultAvatarSettings(type);

  return {
    base: pickOption(options.base, value?.base, defaults.base),
    eyes: pickOption(options.eyes, value?.eyes, defaults.eyes),
    mouth: pickOption(openedMouthOptions, value?.mouth, defaults.mouth),
  };
}
