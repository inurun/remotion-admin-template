import { useMemo } from "react";
import { g2pItemSchema, type G2pItem, type G2pPitch } from "@/_schemas";
import { getUnknownSourceSpans, getWarningsWithoutSourceSpan } from "./unknown-spans";

export type G2pMoraButton = {
  label: string;
  pitch: G2pPitch;
  onClick: () => void;
};

export type G2pWordView = {
  key: string;
  ignored: boolean;
  surface: string;
  isChained: boolean;
  moraButtons: G2pMoraButton[];
  onToggleChain?: () => void;
};

type G2pSegmentView = {
  key: string;
  boundary: G2pItem["segments"][number]["boundary"];
  words: G2pWordView[];
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

function togglePitch(pitch: G2pPitch): G2pPitch {
  return pitch === "high" ? "low" : "high";
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
      return {
        key: `segment-${segmentIndex}`,
        boundary: segment.boundary,
        words: segment.words.map((word, wordIndex) => {
          const ignored = isIgnoredWord(word);
          const canToggleChain = !ignored && wordIndex !== firstSpokenIndex;
          return {
            key: `word-${segmentIndex}-${wordIndex}`,
            ignored,
            surface: word.surface,
            isChained: word.chain,
            moraButtons: ignored
              ? []
              : word.moras.map((mora, moraIndex) => ({
                  label: mora.text,
                  pitch: mora.pitch,
                  onClick: () =>
                    updateItem((item) => {
                      const target =
                        item.segments[segmentIndex]?.words[wordIndex]?.moras[moraIndex];
                      if (!target) {
                        return;
                      }
                      target.pitch = togglePitch(target.pitch);
                    }),
                })),
            onToggleChain: canToggleChain
              ? () =>
                  updateItem((item) => {
                    const target = item.segments[segmentIndex]?.words[wordIndex];
                    if (!target) {
                      return;
                    }
                    target.chain = !target.chain;
                  })
              : undefined,
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
