import { describe, expect, it } from "vitest";
import { createSelectedWordEntry } from "../use-dictionary-selection-popover";

describe("selection dictionary entry", () => {
  it("creates an enabled common-noun fixed entry", () => {
    expect(createSelectedWordEntry("一筒", " イーピン ", 2)).toEqual({
      kind: "fixed",
      surface: "一筒",
      reading: "イーピン",
      pronunciation: null,
      accent_nucleus: 2,
      part_of_speech: "common_noun",
      enabled: true,
    });
  });
});
