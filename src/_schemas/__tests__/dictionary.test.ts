import { describe, expect, it } from "vitest";
import { dictionaryEntryInputSchema } from "@/_schemas";

describe("dictionary schema", () => {
  it("rejects invalid contextual candidates and accent positions", () => {
    expect(
      dictionaryEntryInputSchema.safeParse({
        kind: "fixed",
        surface: "雨衣",
        reading: "アマグ",
        accent_nucleus: 4,
        part_of_speech: "proper_noun",
        enabled: true,
      }).success,
    ).toBe(false);
    expect(
      dictionaryEntryInputSchema.safeParse({
        kind: "contextual",
        surface: "辛い",
        enabled: true,
        candidates: [
          {
            description: "food",
            morphemes: [
              { surface: "辛", reading: "カラ", accent_nucleus: 0, part_of_speech: "adjective" },
            ],
          },
          {
            description: "hard",
            morphemes: [
              {
                surface: "辛い",
                reading: "ツライ",
                accent_nucleus: 0,
                part_of_speech: "adjective",
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
