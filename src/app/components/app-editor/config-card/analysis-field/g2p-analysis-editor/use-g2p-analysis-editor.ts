import { useMemo } from "react";
import { g2pItemSchema, type G2pItem } from "@/_schemas";
import { accentForPitches, pitchesForAccent } from "@/_shared/lib/kana-mora";
import { getUnknownSourceSpans, getWarningsWithoutSourceSpan } from "./unknown-spans";

export type G2pWordView = {
  key: string;
  ignored: boolean;
  surface: string;
  isChained: boolean;
  onToggleChain?: () => void;
};

export type G2pPhraseView = {
  key: string;
  words: G2pWordView[];
  moras: string[];
  accent: number;
  onAccentChange: (accent: number) => void;
};

type G2pSegmentView = {
  key: string;
  boundary: G2pItem["segments"][number]["boundary"];
  phrases: G2pPhraseView[];
};

type ParsedG2pState =
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; item: G2pItem };

function cloneG2pItem(item: G2pItem): G2pItem {
  return structuredClone(item);
}

function isIgnoredWord(word: G2pItem["segments"][number]["words"][number]) {
  return word.metadata.is_ignored;
}

function getFirstSpokenWordIndex(words: G2pItem["segments"][number]["words"]) {
  return words.findIndex((word) => !isIgnoredWord(word));
}

export function groupWordsByAccentPhrase(words: Array<{ chain: boolean; ignored: boolean }>) {
  const groups: number[][] = [];
  for (const [wordIndex, word] of words.entries()) {
    if (!word.ignored && (!word.chain || groups.length === 0)) groups.push([]);
    if (groups.length === 0) groups.push([]);
    groups.at(-1)?.push(wordIndex);
  }
  return groups;
}

function parseG2pState(value: G2pItem | undefined): ParsedG2pState {
  if (!value) {
    return { status: "empty" };
  }

  const parsed = g2pItemSchema.safeParse(value);
  if (!parsed.success) {
    return { status: "error", message: "Invalid analysis" };
  }

  return { status: "ready", item: parsed.data };
}

export function useG2pAnalysisEditor(
  value: G2pItem | undefined,
  onChange: (value: G2pItem) => void,
) {
  const parsed = useMemo(() => parseG2pState(value), [value]);

  function updateItem(mutate: (item: G2pItem) => void) {
    if (parsed.status !== "ready") {
      return;
    }

    const next = cloneG2pItem(parsed.item);
    mutate(next);
    onChange(next);
  }

  const unknownSpans = parsed.status === "ready" ? getUnknownSourceSpans(parsed.item) : [];
  const warningsWithoutSpan =
    parsed.status === "ready" ? getWarningsWithoutSourceSpan(parsed.item) : [];

  function getSegmentViews(): G2pSegmentView[] {
    if (parsed.status !== "ready") {
      return [];
    }

    return parsed.item.segments.map((segment, segmentIndex) => {
      const firstSpokenIndex = getFirstSpokenWordIndex(segment.words);
      const phraseWordIndexes = groupWordsByAccentPhrase(
        segment.words.map((word) => ({ chain: word.chain, ignored: isIgnoredWord(word) })),
      );
      return {
        key: `segment-${segmentIndex}`,
        boundary: segment.boundary,
        phrases: phraseWordIndexes.map((wordIndexes, phraseIndex) => {
          const phraseWords = wordIndexes.map((wordIndex) => segment.words[wordIndex]);
          const moras = phraseWords.flatMap((word) => word?.moras ?? []);
          return {
            key: `phrase-${segmentIndex}-${phraseIndex}`,
            words: wordIndexes.flatMap((wordIndex) => {
              const word = segment.words[wordIndex];
              if (!word) return [];
              const ignored = isIgnoredWord(word);
              return [
                {
                  key: `word-${segmentIndex}-${wordIndex}`,
                  ignored,
                  surface: word.surface,
                  isChained: word.chain,
                  onToggleChain:
                    !ignored && wordIndex !== firstSpokenIndex
                      ? () =>
                          updateItem((item) => {
                            const target = item.segments[segmentIndex]?.words[wordIndex];
                            if (target) target.chain = !target.chain;
                          })
                      : undefined,
                },
              ];
            }),
            moras: moras.map((mora) => mora.text),
            accent: accentForPitches(moras.map((mora) => mora.pitch)) ?? 0,
            onAccentChange: (accent: number) =>
              updateItem((item) => {
                const pitches = pitchesForAccent(moras.length, accent);
                let moraIndex = 0;
                for (const wordIndex of wordIndexes) {
                  for (const mora of item.segments[segmentIndex]?.words[wordIndex]?.moras ?? []) {
                    mora.pitch = pitches[moraIndex] ?? mora.pitch;
                    moraIndex += 1;
                  }
                }
              }),
          };
        }),
      };
    });
  }

  return {
    parsed,
    unknownSpans,
    warningsWithoutSpan,
    getSegmentViews,
  };
}
