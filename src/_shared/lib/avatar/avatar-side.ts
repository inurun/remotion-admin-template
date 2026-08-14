import type { AvatarType } from "@/_schemas";

export type AvatarSide = "left" | "right";

const avatarSideByType: Record<AvatarType, AvatarSide> = {
  demo: "left",
};

export function getAvatarSide(type: AvatarType): AvatarSide {
  return avatarSideByType[type];
}
