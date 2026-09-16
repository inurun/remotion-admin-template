import type { DictionaryWord, G2pItem, G2pWarning, StoredG2pItem } from "@/_schemas";

export function toG2pItem(item: { text: string; kana: string; warnings?: G2pWarning[] }): G2pItem {
  return {
    text: item.text,
    kana: item.kana,
    warnings: item.warnings ?? [],
  };
}

export function dictionaryWordsForLlm(words: DictionaryWord[] | null | undefined) {
  if (words == null || words.length === 0) {
    return undefined;
  }
  return words;
}

export function withLlmDictionaryWords<T extends object>(
  item: T,
  words: DictionaryWord[] | null | undefined,
): T & { dictionaryWords?: DictionaryWord[] } {
  const dictionaryWords = dictionaryWordsForLlm(words);
  return dictionaryWords ? { ...item, dictionaryWords } : item;
}

function sameDictionaryWords(
  left: DictionaryWord[] | null | undefined,
  right: DictionaryWord[] | null | undefined,
) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export function withoutStaleDictionaryWords(
  g2p: StoredG2pItem,
  previous: StoredG2pItem | undefined,
): StoredG2pItem {
  if (g2p.dictionary_words === undefined) {
    return g2p;
  }
  if (!previous || (previous.text === g2p.text && previous.kana === g2p.kana)) {
    return g2p;
  }
  if (sameDictionaryWords(previous.dictionary_words, g2p.dictionary_words)) {
    return toG2pItem(g2p);
  }
  return g2p;
}
