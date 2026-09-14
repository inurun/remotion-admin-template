import { describe, expect, it } from "vitest";
import {
  analyzeItemSchema,
  countG2pPronunciationWords,
  dictionaryWordsForLlm,
  g2pItemSchema,
  storedG2pItemSchema,
  toG2pItem,
  withoutStaleDictionaryWords,
} from "../g2p";
import {
  ameKoroAnalyzeItem,
  ameKoroRepeatedAnalyzeItem,
  contextualAnalyzeItem,
  contextualMultiWordAnalyzeItem,
  createAnalyzeItem,
  createG2pItem,
  noDictionaryAnalyzeItem,
  untrackedAnalyzeItem,
} from "./g2p-fixture";

describe("g2pItemSchema", () => {
  it("accepts a valid item", () => {
    expect(g2pItemSchema.parse(createG2pItem("こんにちは", "コンニチワ'")).kana).toBe(
      "コンニチワ'",
    );
  });

  it("strips dictionary_words from the shared G2P item", () => {
    expect(g2pItemSchema.parse(ameKoroAnalyzeItem)).toEqual({
      text: "雨衣",
      kana: "アメコロ'",
      warnings: [],
    });
  });

  it("rejects a source_span outside the UTF-16 text", () => {
    const item = createG2pItem("ab");
    item.warnings = [
      {
        code: "unknown_word",
        source_span: { start_utf16: 0, end_utf16: 4 },
      },
    ];

    expect(g2pItemSchema.safeParse(item).success).toBe(false);
  });

  it("accepts a source_span that matches JS string indexes around emoji", () => {
    const text = "A𰻞B";
    const item = createG2pItem(text);
    item.warnings = [
      {
        code: "unknown_word",
        source_span: { start_utf16: 1, end_utf16: 3 },
      },
    ];

    expect(g2pItemSchema.parse(item).warnings[0]?.source_span).toEqual({
      start_utf16: 1,
      end_utf16: 3,
    });
    expect(text.slice(1, 3)).toBe("𰻞");
  });

  it("accepts an unknown boundary warning without a source_span", () => {
    const text = "前⋯後";
    const item = createG2pItem(text);
    item.warnings = [
      {
        code: "unknown_word",
        source_span: { start_utf16: 1, end_utf16: 2 },
      },
    ];

    const warning = g2pItemSchema.parse(item).warnings[0];
    const span = warning?.source_span;
    expect(span).toEqual({ start_utf16: 1, end_utf16: 2 });
    expect(span && text.slice(span.start_utf16, span.end_utf16)).toBe("⋯");
  });
});

describe("analyzeItemSchema", () => {
  it("accepts the contract fixtures", () => {
    expect(analyzeItemSchema.parse(ameKoroAnalyzeItem).dictionary_words).toEqual([
      { word_index: 0, kind: "fixed" },
    ]);
    expect(analyzeItemSchema.parse(ameKoroRepeatedAnalyzeItem).dictionary_words).toEqual([
      { word_index: 0, kind: "fixed" },
      { word_index: 1, kind: "fixed" },
    ]);
    expect(analyzeItemSchema.parse(noDictionaryAnalyzeItem).dictionary_words).toEqual([]);
    expect(analyzeItemSchema.parse(untrackedAnalyzeItem).dictionary_words).toBeNull();
    expect(analyzeItemSchema.parse(contextualAnalyzeItem).dictionary_words).toEqual([
      { word_index: 0, kind: "contextual" },
    ]);
    expect(analyzeItemSchema.parse(contextualMultiWordAnalyzeItem).dictionary_words).toEqual([
      { word_index: 0, kind: "contextual" },
      { word_index: 2, kind: "contextual" },
    ]);
  });

  it("rejects a missing dictionary_words field instead of coercing it to []", () => {
    expect(analyzeItemSchema.safeParse(createG2pItem("雨衣", "アメコロ'")).success).toBe(false);
  });

  it("rejects negative, duplicate, unsorted, and out-of-range word_index values", () => {
    expect(
      analyzeItemSchema.safeParse(
        createAnalyzeItem("雨衣", "アメコロ'", [{ word_index: -1, kind: "fixed" }]),
      ).success,
    ).toBe(false);
    expect(
      analyzeItemSchema.safeParse(
        createAnalyzeItem("雨衣雨衣", "アメコロ'/アメコロ'", [
          { word_index: 0, kind: "fixed" },
          { word_index: 0, kind: "fixed" },
        ]),
      ).success,
    ).toBe(false);
    expect(
      analyzeItemSchema.safeParse(
        createAnalyzeItem("雨衣雨衣", "アメコロ'/アメコロ'", [
          { word_index: 1, kind: "fixed" },
          { word_index: 0, kind: "fixed" },
        ]),
      ).success,
    ).toBe(false);
    expect(
      analyzeItemSchema.safeParse(
        createAnalyzeItem("雨衣", "アメコロ'", [{ word_index: 1, kind: "fixed" }]),
      ).success,
    ).toBe(false);
  });
});

describe("stored G2P helpers", () => {
  it("counts pronunciation words across phrases without treating | split as enough", () => {
    expect(countG2pPronunciationWords("アメコロ'")).toBe(1);
    expect(countG2pPronunciationWords("アメコロ'/アメコロ'")).toBe(2);
    expect(countG2pPronunciationWords("ニンキ|ノ'/ナ'イ")).toBe(3);
  });

  it("omits empty and null dictionary_words from the LLM payload", () => {
    expect(dictionaryWordsForLlm([])).toBeUndefined();
    expect(dictionaryWordsForLlm(null)).toBeUndefined();
    expect(dictionaryWordsForLlm([{ word_index: 0, kind: "fixed" }])).toEqual([
      { word_index: 0, kind: "fixed" },
    ]);
  });

  it("drops dictionary_words from synthesis items and stale edited kana", () => {
    expect(toG2pItem(ameKoroAnalyzeItem)).toEqual({
      text: "雨衣",
      kana: "アメコロ'",
      warnings: [],
    });
    expect(withoutStaleDictionaryWords(ameKoroAnalyzeItem, undefined)).toEqual(ameKoroAnalyzeItem);
    expect(withoutStaleDictionaryWords(ameKoroAnalyzeItem, ameKoroAnalyzeItem)).toEqual(
      ameKoroAnalyzeItem,
    );
    expect(withoutStaleDictionaryWords(ameKoroAnalyzeItem, createG2pItem("雨衣", "ウイ'"))).toEqual(
      ameKoroAnalyzeItem,
    );
    expect(
      withoutStaleDictionaryWords({ ...ameKoroAnalyzeItem, kana: "ウイ'" }, ameKoroAnalyzeItem),
    ).toEqual({
      text: "雨衣",
      kana: "ウイ'",
      warnings: [],
    });
  });

  it("keeps omitted dictionary_words on stored items that are not Analyze results", () => {
    expect(storedG2pItemSchema.parse(createG2pItem("雨衣", "アメコロ'")).dictionary_words).toBe(
      undefined,
    );
  });
});
