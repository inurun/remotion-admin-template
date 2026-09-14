import { describe, expect, it } from "vitest";
import { ameKoroAnalyzeItem } from "@/_schemas/__tests__/g2p-fixture";
import {
  dictionaryWordReadingChanges,
  EMPTY_EVAL_USAGE,
  finalKana,
  summarizeDictionaryEvalRuns,
} from "../dictionary-provenance-eval";

const ameKoroWords = ameKoroAnalyzeItem.dictionary_words ?? [];

describe("dictionary provenance eval scoring", () => {
  it("uses baseline kana when changed is false", () => {
    expect(finalKana("アメコロ'", { changed: false, kana: "ウイ'" })).toBe("アメコロ'");
    expect(finalKana("アメコロ'", { changed: true, kana: "ウイ'" })).toBe("ウイ'");
    expect(finalKana("アメコロ'", undefined)).toBe("アメコロ'");
  });

  it("compares dictionary words by pronunciation index, not substring", () => {
    expect(dictionaryWordReadingChanges("アメコロ'", "アメコロ'", ameKoroWords)).toEqual([
      {
        wordIndex: 0,
        kind: "fixed",
        baselineReading: "アメコロ",
        finalReading: "アメコロ",
        status: "kept",
      },
    ]);
    expect(dictionaryWordReadingChanges("アメコロ'", "ウイ'", ameKoroWords)).toEqual([
      {
        wordIndex: 0,
        kind: "fixed",
        baselineReading: "アメコロ",
        finalReading: "ウイ",
        status: "changed",
      },
    ]);
    expect(dictionaryWordReadingChanges("アメコロ'", "ウイアメコロ'", ameKoroWords)).toEqual([
      {
        wordIndex: 0,
        kind: "fixed",
        baselineReading: "アメコロ",
        finalReading: "ウイアメコロ",
        status: "changed",
      },
    ]);
    expect(dictionaryWordReadingChanges("アメコロ'", "ウイ", ameKoroWords)).toEqual([
      {
        wordIndex: 0,
        kind: "fixed",
        baselineReading: "アメコロ",
        finalReading: null,
        status: "unevaluable",
      },
    ]);
  });

  it("summarizes kept and changed fixed readings without requiring success", () => {
    expect(
      summarizeDictionaryEvalRuns([
        {
          index: 1,
          ok: true,
          changed: false,
          finalKana: "アメコロ'",
          elapsedMs: 10,
          usage: EMPTY_EVAL_USAGE,
          dictionaryWordReadings: dictionaryWordReadingChanges(
            "アメコロ'",
            "アメコロ'",
            ameKoroWords,
          ),
        },
        {
          index: 2,
          ok: true,
          changed: true,
          finalKana: "ウイ'",
          elapsedMs: 20,
          usage: { ...EMPTY_EVAL_USAGE, promptTokens: 8, totalTokens: 8, costUsd: 0.01 },
          dictionaryWordReadings: dictionaryWordReadingChanges("アメコロ'", "ウイ'", ameKoroWords),
        },
        {
          index: 3,
          ok: false,
          elapsedMs: 5,
          usage: EMPTY_EVAL_USAGE,
          error: { message: "timeout" },
        },
      ]),
    ).toEqual({
      attempts: 3,
      ok: 2,
      errors: 1,
      changedTrue: 1,
      changedFalse: 1,
      fixedAppearances: 2,
      fixedKept: 1,
      fixedChanged: 1,
      unevaluable: 0,
      totalPromptTokens: 8,
      totalCompletionTokens: 0,
      totalTokens: 8,
      totalCostUsd: 0.01,
      totalElapsedMs: 35,
    });
  });
});
