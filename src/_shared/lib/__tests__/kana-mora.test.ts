import { describe, expect, it } from "vitest";
import { accentForPitches, pitchesForAccent, splitKanaMoras } from "@/_shared/lib/kana-mora";

describe("dictionary mora accents", () => {
  it("splits kana using haqumei-compatible small kana grouping", () => {
    expect(splitKanaMoras("きょうって")).toEqual(["キョ", "ウ", "ッ", "テ"]);
  });

  it("only derives VOICEVOX-representable pitch shapes", () => {
    expect(pitchesForAccent(2, 1)).toEqual(["high", "low"]);
    expect(pitchesForAccent(3, 2)).toEqual(["low", "high", "low"]);
    expect(pitchesForAccent(3, 0)).toEqual(["low", "high", "high"]);
    expect(pitchesForAccent(1, 0)).toEqual(["high"]);
  });

  it("only recognizes VOICEVOX-representable pitch shapes", () => {
    expect(accentForPitches(["high", "low"])).toBe(1);
    expect(accentForPitches(["low", "high", "low"])).toBe(2);
    expect(accentForPitches(["low", "high", "high"])).toBe(0);
    expect(accentForPitches(["low", "high", "low", "high"])).toBeNull();
    expect(accentForPitches(["low", "low"])).toBeNull();
  });
});
