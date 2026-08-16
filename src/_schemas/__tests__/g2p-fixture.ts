import type { G2pItem } from "@/_schemas";

export function createG2pItem(
  text: string,
  overrides: Partial<G2pItem["segments"][number]["words"][number]> = {},
): G2pItem {
  return {
    text,
    segments: [
      {
        words: [
          {
            surface: text,
            chain: false,
            moras: [{ text: "ア", pitch: "high" }],
            metadata: {
              orig: text,
              read: text,
              pos: "*",
              pos_group1: "*",
              pos_group2: "*",
              pos_group3: "*",
              ctype: "*",
              cform: "*",
              is_unknown: false,
              is_ignored: false,
            },
            ...overrides,
          },
        ],
        boundary: "none",
      },
    ],
    warnings: [],
  };
}
