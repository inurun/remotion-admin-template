import { avatarOptions, type AvatarType } from "@/_schemas";

const eyesAliases: Record<string, string> = {
  "shaded-open": "shaded-opened",
};

export function normalizeEyesToken(token: string, avatarType: AvatarType): string | null {
  const normalized = eyesAliases[token] ?? token;
  const options = avatarOptions[avatarType].eyes as readonly string[];
  return options.includes(normalized) ? normalized : null;
}

export function getEyesOptions(avatarType: AvatarType): readonly string[] {
  return avatarOptions[avatarType].eyes;
}
