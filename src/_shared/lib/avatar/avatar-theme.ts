import type { AvatarType } from "@/_schemas";

export type AvatarTheme = {
  displayName: string;
  color: string;
};

const avatarThemeByType: Record<AvatarType, AvatarTheme> = {
  demo: { displayName: "Demo", color: "var(--color-demo)" },
};

export function getAvatarTheme(type: AvatarType): AvatarTheme {
  return avatarThemeByType[type];
}
