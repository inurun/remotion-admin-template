import type { AnalyzeItem, DictionaryWord, G2pItem } from "@/_schemas";

export function createG2pItem(text: string, kana = "ア'"): G2pItem {
  return {
    text,
    kana,
    warnings: [],
  };
}

export function createAnalyzeItem(
  text: string,
  kana = "ア'",
  dictionaryWords: DictionaryWord[] | null = [],
): AnalyzeItem {
  return {
    text,
    kana,
    warnings: [],
    dictionary_words: dictionaryWords,
  };
}

export const ameKoroAnalyzeItem: AnalyzeItem = {
  text: "雨衣",
  kana: "アメコロ'",
  warnings: [],
  dictionary_words: [{ word_index: 0, kind: "fixed" }],
};

export const ameKoroRepeatedAnalyzeItem: AnalyzeItem = {
  text: "雨衣雨衣",
  kana: "アメコロ'/アメコロ'",
  warnings: [],
  dictionary_words: [
    { word_index: 0, kind: "fixed" },
    { word_index: 1, kind: "fixed" },
  ],
};

export const noDictionaryAnalyzeItem: AnalyzeItem = createAnalyzeItem("こんにちは", "コンニチワ'");

export const untrackedAnalyzeItem: AnalyzeItem = createAnalyzeItem("雨衣", "アメコロ'", null);

export const contextualAnalyzeItem: AnalyzeItem = createAnalyzeItem("人気", "ヒトケ'", [
  { word_index: 0, kind: "contextual" },
]);

export const contextualMultiWordAnalyzeItem: AnalyzeItem = createAnalyzeItem(
  "人気のない人気スポット",
  "ヒトケ|ノ'/ナ'イ/ニンキ|スポ'ット",
  [
    { word_index: 0, kind: "contextual" },
    { word_index: 2, kind: "contextual" },
  ],
);
