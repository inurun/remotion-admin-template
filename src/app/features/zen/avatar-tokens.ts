import { avatarOptions, type AvatarSettings, type AvatarType } from "@/_schemas";
import { getOpenedMouthOptions, resolveAvatarSettings } from "@/_shared/lib/avatar/avatar-settings";

export const avatarTokenFields = { b: "base", e: "eyes", m: "mouth" } as const;

export function getZenAvatarOptions(type: AvatarType) {
  return { ...avatarOptions[type], mouth: getOpenedMouthOptions(type) };
}

export function parseAvatarTokens(tokens: string[], type: AvatarType): AvatarSettings {
  const avatar = resolveAvatarSettings(type, undefined);
  const options = getZenAvatarOptions(type);
  const seen = new Set<string>();
  for (const token of tokens) {
    const match = /^([bem])\.(.+)$/.exec(token);
    if (!match) throw new Error(`Invalid avatar token "${token}".`);
    const key = match[1] as keyof typeof avatarTokenFields;
    const field = avatarTokenFields[key];
    if (seen.has(key)) throw new Error(`Duplicate avatar key "${key}".`);
    seen.add(key);
    const value = match[2];
    if (!(options[field] as readonly string[]).includes(value)) {
      throw new Error(`Unknown ${field} "${value}".`);
    }
    avatar[field] = value;
  }
  return avatar;
}

export function serializeAvatarTokens(avatar: AvatarSettings, type: AvatarType) {
  const defaults = resolveAvatarSettings(type, undefined);
  return Object.entries(avatarTokenFields)
    .filter(([, field]) => avatar[field] !== defaults[field])
    .map(([key, field]) => `${key}.${avatar[field]}`)
    .join(" ");
}
