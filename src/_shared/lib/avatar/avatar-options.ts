export const avatarOptions = {
  demo: {
    base: ["normal"],
    eyes: ["opened", "shaded-opened"],
    mouth: ["opened", "closed"],
  },
} as const;

export type AvatarType = keyof typeof avatarOptions;
