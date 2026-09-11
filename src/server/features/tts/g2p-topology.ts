export type G2pBoundaryAfter = "/" | "、" | "？" | "！" | "";

type StructuredPhraseLike = {
  leadingWords: string[];
  trailingWords: string[];
  boundaryAfter: G2pBoundaryAfter;
};

type StructuredCorrectionLike = {
  id: string;
  changed: boolean;
  phrases: StructuredPhraseLike[];
};

export type G2pPhraseTopology = {
  wordCount: number;
  accentedWordIndex: number;
  boundaryAfter: G2pBoundaryAfter;
};

export type G2pTopology = {
  phrases: G2pPhraseTopology[];
};

export type StructuredG2pPhrase = {
  leadingWords: string[];
  accentedWord: {
    beforeNucleus: string;
    afterNucleus: string;
  };
  trailingWords: string[];
  boundaryAfter: G2pBoundaryAfter;
};

type ParsedG2pPhrase = {
  words: string[];
  accentedWordIndex: number;
  boundaryAfter: G2pBoundaryAfter;
};

const BOUNDARY_CHARS = new Set(["/", "、", "？", "！"]);

function isBoundaryChar(value: string | undefined): value is Exclude<G2pBoundaryAfter, ""> {
  return value === "/" || value === "、" || value === "？" || value === "！";
}

function parseG2pPhrases(kana: string): ParsedG2pPhrase[] | null {
  if (!kana) {
    return null;
  }

  const phrases: ParsedG2pPhrase[] = [];
  let start = 0;

  for (let index = 0; index <= kana.length; index += 1) {
    const char = kana[index];
    const atBoundary = char !== undefined && BOUNDARY_CHARS.has(char);
    const atEnd = index === kana.length;
    if (!atBoundary && !atEnd) {
      continue;
    }

    const body = kana.slice(start, index);
    if (!body) {
      return null;
    }

    const words = body.split("|");
    const accentedWordIndex = words.findIndex((word) => word.includes("'"));
    const quoteCount = [...body].filter((item) => item === "'").length;
    if (
      accentedWordIndex < 0 ||
      quoteCount !== 1 ||
      words.some((word) => word.replaceAll("'", "").length === 0)
    ) {
      return null;
    }

    phrases.push({
      words,
      accentedWordIndex,
      boundaryAfter: isBoundaryChar(char) ? char : "",
    });

    if (atEnd) {
      break;
    }
    start = index + 1;
  }

  if (phrases.length === 0) {
    return null;
  }
  if (phrases.at(-1)?.boundaryAfter === "/") {
    return null;
  }
  return phrases;
}

export function parseG2pTopology(kana: string): G2pTopology | null {
  const phrases = parseG2pPhrases(kana);
  if (!phrases) {
    return null;
  }

  return {
    phrases: phrases.map((phrase) => ({
      wordCount: phrase.words.length,
      accentedWordIndex: phrase.accentedWordIndex,
      boundaryAfter: phrase.boundaryAfter,
    })),
  };
}

export function structuredPhrasesFromKana(kana: string): StructuredG2pPhrase[] | undefined {
  const phrases = parseG2pPhrases(kana);
  if (!phrases) {
    return undefined;
  }

  const structured = phrases.map((phrase) => {
    const accented = phrase.words[phrase.accentedWordIndex] ?? "";
    const quote = accented.indexOf("'");
    if (quote < 1) {
      return undefined;
    }
    return {
      leadingWords: phrase.words.slice(0, phrase.accentedWordIndex),
      accentedWord: {
        beforeNucleus: accented.slice(0, quote),
        afterNucleus: accented.slice(quote + 1),
      },
      trailingWords: phrase.words.slice(phrase.accentedWordIndex + 1),
      boundaryAfter: phrase.boundaryAfter,
    };
  });
  if (structured.some((phrase) => phrase === undefined)) {
    return undefined;
  }
  return structured.filter((phrase): phrase is StructuredG2pPhrase => phrase !== undefined);
}

export function topologyFromStructuredPhrases(phrases: StructuredPhraseLike[]): G2pTopology {
  return {
    phrases: phrases.map((phrase) => ({
      wordCount: phrase.leadingWords.length + 1 + phrase.trailingWords.length,
      accentedWordIndex: phrase.leadingWords.length,
      boundaryAfter: phrase.boundaryAfter,
    })),
  };
}

export function topologiesEqual(left: G2pTopology, right: G2pTopology) {
  if (left.phrases.length !== right.phrases.length) {
    return false;
  }

  return left.phrases.every((phrase, index) => {
    const other = right.phrases[index];
    return (
      other !== undefined &&
      phrase.wordCount === other.wordCount &&
      phrase.accentedWordIndex === other.accentedWordIndex &&
      phrase.boundaryAfter === other.boundaryAfter
    );
  });
}

export function automaticTopologyGuardError(
  baselineKana: string,
  correction: StructuredCorrectionLike,
) {
  if (!correction.changed) {
    return undefined;
  }

  const baseline = parseG2pTopology(baselineKana);
  if (!baseline) {
    return `unparseable baseline kana for TTS ${correction.id}`;
  }

  const candidate = topologyFromStructuredPhrases(correction.phrases);
  if (!topologiesEqual(baseline, candidate)) {
    return `automatic topology changed for TTS ${correction.id}`;
  }

  return undefined;
}
