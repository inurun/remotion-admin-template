import { useEffect, useState } from "react";
import {
  cloneTsmlDocument,
  getWordAttribute,
  parseTsml,
  type TsmlDocument,
  type TsmlPhrase,
  type TsmlWord,
  serializeTsml,
  setPhraseBoundaryChain,
  splitPronunciationIntoMoras,
  toggleWordHlAtIndex,
} from "./lib";

export type TsmlMoraButton = {
  active: boolean;
  label: string;
  onClick: () => void;
};

export type TsmlWordView = {
  isChained: boolean;
  key: string;
  moraButtons: TsmlMoraButton[];
  onToggleChain?: () => void;
};

export type TsmlPhraseViewModel = {
  key: string;
  words: TsmlWordView[];
};

export type ParsedTsmlState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; document: TsmlDocument };

function getTsmlParseErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to parse TSML";
}

function parseTsmlState(value?: string): ParsedTsmlState {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { status: "empty" };
  }

  try {
    return {
      status: "ready",
      document: parseTsml(trimmed),
    };
  } catch (error) {
    return {
      status: "error",
      message: getTsmlParseErrorMessage(error),
    };
  }
}

function useParsedTsml(value?: string): ParsedTsmlState {
  const [parsed, setParsed] = useState<ParsedTsmlState>({ status: "loading" });

  useEffect(() => {
    setParsed(parseTsmlState(value));
  }, [value]);

  return parsed;
}

function hasEditableWordData(hl: string, moras: string[]) {
  if (!hl || moras.length === 0) {
    return false;
  }

  return hl.length === moras.length;
}

function getEditableWordData(word: TsmlWord) {
  const pronunciation = getWordAttribute(word, "pronunciation") ?? "";
  const moras = splitPronunciationIntoMoras(pronunciation);
  const hl = getWordAttribute(word, "hl") ?? "";

  if (!hasEditableWordData(hl, moras)) {
    return null;
  }

  return { hl, moras };
}

function getChainState(nextWord: TsmlWord | undefined) {
  return nextWord ? (getWordAttribute(nextWord, "chain") ?? "0") === "1" : false;
}

export function useTsmlEditor(value?: string) {
  const parsed = useParsedTsml(value);

  function updateDocument(
    mutate: (document: TsmlDocument) => void,
    onChange: (nextValue: string) => void,
  ) {
    if (parsed.status !== "ready") {
      return;
    }

    const nextDocument = cloneTsmlDocument(parsed.document);
    mutate(nextDocument);
    onChange(serializeTsml(nextDocument));
  }

  function createMoraButtons({
    fieldOnChange,
    hl,
    moras,
    phraseIndex,
    wordIndex,
  }: {
    fieldOnChange: (value: string) => void;
    hl: string;
    moras: string[];
    phraseIndex: number;
    wordIndex: number;
  }): TsmlMoraButton[] {
    return moras.map((mora, moraIndex) => ({
      label: mora,
      active: hl[moraIndex] === "h",
      onClick: () => {
        updateDocument((document) => {
          const next = document.phrases[phraseIndex]?.words[wordIndex];
          if (next) {
            toggleWordHlAtIndex(next, moraIndex);
          }
        }, fieldOnChange);
      },
    }));
  }

  function createWordView({
    fieldOnChange,
    phrase,
    phraseIndex,
    word,
    wordIndex,
  }: {
    fieldOnChange: (value: string) => void;
    phrase: TsmlPhrase;
    phraseIndex: number;
    word: TsmlWord;
    wordIndex: number;
  }): TsmlWordView | null {
    const editableWord = getEditableWordData(word);
    if (!editableWord) {
      return null;
    }

    const nextWord = phrase.words[wordIndex + 1];
    const isChained = getChainState(nextWord);

    return {
      key: `${phraseIndex}-${wordIndex}`,
      isChained,
      moraButtons: createMoraButtons({
        fieldOnChange,
        hl: editableWord.hl,
        moras: editableWord.moras,
        phraseIndex,
        wordIndex,
      }),
      onToggleChain: nextWord
        ? () => {
            updateDocument((document) => {
              setPhraseBoundaryChain(document, phraseIndex, wordIndex, !isChained);
            }, fieldOnChange);
          }
        : undefined,
    };
  }

  function getPhraseViews(fieldOnChange: (value: string) => void): TsmlPhraseViewModel[] {
    if (parsed.status !== "ready") {
      return [];
    }

    return parsed.document.phrases.map((phrase, phraseIndex) => ({
      key: `phrase-${phraseIndex}`,
      words: phrase.words
        .map((word, wordIndex) =>
          createWordView({
            fieldOnChange,
            phrase,
            phraseIndex,
            word,
            wordIndex,
          }),
        )
        .filter((word): word is TsmlWordView => word !== null),
    }));
  }

  return {
    parsed,
    getPhraseViews,
  };
}
