import type { AvatarType } from "@/_schemas";

const OTHER_DIMENSION_AVATARS = new Set<AvatarType>([]);

export function isOtherDimensionAvatar(type: AvatarType): boolean {
  return OTHER_DIMENSION_AVATARS.has(type);
}
