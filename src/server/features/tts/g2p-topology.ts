export type G2pBoundaryAfter = "/" | "、" | "？" | "！" | "";

export type G2pPhraseTopology = {
  wordCount: number;
  accentedWordIndex: number;
  boundaryAfter: G2pBoundaryAfter;
};

export type G2pTopology = {
  phrases: G2pPhraseTopology[];
};

export type CorrectionErrorKind = "syntax" | "topology" | "validate";

export type CorrectionError = {
  kind: CorrectionErrorKind;
  message: string;
};

type ParsedG2pPhrase = {
  words: string[];
  accentedWordIndex: number;
  boundaryAfter: G2pBoundaryAfter;
};

type PhraseSlice = {
  body: string;
  boundaryAfter: G2pBoundaryAfter;
};

const BOUNDARY_CHARS = new Set(["/", "、", "？", "！"]);

function isBoundaryChar(value: string | undefined): value is Exclude<G2pBoundaryAfter, ""> {
  return value === "/" || value === "、" || value === "？" || value === "！";
}

function quote(value: string) {
  return JSON.stringify(value);
}

function sliceG2pPhrases(kana: string): PhraseSlice[] {
  const phrases: PhraseSlice[] = [];
  let start = 0;

  for (let index = 0; index <= kana.length; index += 1) {
    const char = kana[index];
    const atBoundary = char !== undefined && BOUNDARY_CHARS.has(char);
    const atEnd = index === kana.length;
    if (!atBoundary && !atEnd) {
      continue;
    }

    const body = kana.slice(start, index);
    if (atEnd && !body && phrases.length > 0) {
      break;
    }

    phrases.push({
      body,
      boundaryAfter: isBoundaryChar(char) ? char : "",
    });

    if (atEnd) {
      break;
    }
    start = index + 1;
  }

  return phrases;
}

function phraseLabel(index: number, slice: PhraseSlice) {
  return `phrase ${index + 1} ${quote(`${slice.body}${slice.boundaryAfter}`)}`;
}

export function dslSyntaxErrors(kana: string): string[] {
  if (!kana) {
    return ["kana is empty"];
  }

  const slices = sliceG2pPhrases(kana);
  if (slices.length === 0) {
    return ["kana is empty"];
  }

  const issues: string[] = [];
  for (const [index, slice] of slices.entries()) {
    if (!slice.body) {
      issues.push(`${phraseLabel(index, slice)} is empty`);
      continue;
    }

    const words = slice.body.split("|");
    const quoteCount = [...slice.body].filter((item) => item === "'").length;
    const emptyWord = words.some((word) => word.replaceAll("'", "").length === 0);
    const label = phraseLabel(index, slice);
    if (emptyWord) {
      issues.push(`${label}: empty word slot`);
    }
    if (quoteCount === 0) {
      issues.push(`${label}: missing accent nucleus '`);
    } else if (quoteCount !== 1) {
      issues.push(
        `${label}: ${quoteCount} accent nuclei (must be exactly 1). Restore '/' from baselineKana if two phrases were merged`,
      );
    }
  }

  if (slices.at(-1)?.boundaryAfter === "/") {
    issues.push(`last phrase must not end with '/'; copy the baseline final boundary`);
  }
  return issues;
}

export function dslSyntaxError(kana: string): string | undefined {
  return dslSyntaxErrors(kana)[0];
}

function parseValidPhrases(kana: string): ParsedG2pPhrase[] | undefined {
  if (dslSyntaxErrors(kana).length > 0) {
    return undefined;
  }

  return sliceG2pPhrases(kana).map((slice) => {
    const words = slice.body.split("|");
    return {
      words,
      accentedWordIndex: words.findIndex((word) => word.includes("'")),
      boundaryAfter: slice.boundaryAfter,
    };
  });
}

export function parseG2pTopology(kana: string): G2pTopology | null {
  const phrases = parseValidPhrases(kana);
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

function countChar(value: string, char: string) {
  return [...value].filter((item) => item === char).length;
}

function hintDroppedPhraseBreaks(baselineKana: string, candidateKana: string) {
  const droppedSlashes = countChar(baselineKana, "/") - countChar(candidateKana, "/");
  if (droppedSlashes > 0) {
    return ` Candidate dropped ${droppedSlashes} '/'. Copy phrase breaks from baselineKana and keep the intended reading.`;
  }
  return "";
}

function topologyDiffMessage(baseline: G2pTopology, candidate: G2pTopology) {
  if (baseline.phrases.length !== candidate.phrases.length) {
    return `topology changed: phrase count baseline=${baseline.phrases.length} candidate=${candidate.phrases.length}. Restore baseline '/' 、 ？ ！ breaks; keep the intended reading.`;
  }

  const diffs: string[] = [];
  for (const [index, phrase] of baseline.phrases.entries()) {
    const other = candidate.phrases[index]!;
    const parts: string[] = [];
    if (phrase.wordCount !== other.wordCount) {
      parts.push(`word slots ${phrase.wordCount}->${other.wordCount}`);
    }
    if (phrase.accentedWordIndex !== other.accentedWordIndex) {
      parts.push(`nucleus slot ${phrase.accentedWordIndex}->${other.accentedWordIndex}`);
    }
    if (phrase.boundaryAfter !== other.boundaryAfter) {
      parts.push(`boundaryAfter ${quote(phrase.boundaryAfter)}->${quote(other.boundaryAfter)}`);
    }
    if (parts.length > 0) {
      diffs.push(`phrase ${index + 1}: ${parts.join(", ")}`);
    }
  }

  return `topology changed: ${diffs.join("; ")}. Copy baseline | / ' slots; keep mora readings.`;
}

export function automaticTopologyGuardError(
  baselineKana: string,
  candidateKana: string,
  ttsId: string,
) {
  const baseline = parseG2pTopology(baselineKana);
  if (!baseline) {
    return `unparseable baseline kana for TTS ${ttsId}`;
  }

  const candidate = parseG2pTopology(candidateKana);
  if (!candidate) {
    return `unparseable candidate kana for TTS ${ttsId}`;
  }

  if (!topologiesEqual(baseline, candidate)) {
    return topologyDiffMessage(baseline, candidate);
  }

  return undefined;
}

function insertQuote(reading: string, at: number) {
  if (!reading) {
    return reading;
  }
  const index = Math.min(Math.max(at, 1), reading.length);
  return `${reading.slice(0, index)}'${reading.slice(index)}`;
}

function quoteOffsetInWord(word: string) {
  const index = word.indexOf("'");
  if (index < 0) {
    return undefined;
  }
  return word.slice(0, index).replaceAll("'", "").length;
}

function extractG2pWords(kana: string) {
  return sliceG2pPhrases(kana).flatMap((slice) =>
    slice.body.split("|").filter((word) => word.replaceAll("'", "").length > 0),
  );
}

function groupCandidateWords(slotCount: number, words: string[]) {
  if (words.length < slotCount) {
    return undefined;
  }

  const groups: string[][] = [];
  let index = 0;
  for (let slot = 0; slot < slotCount; slot += 1) {
    const remainSlots = slotCount - slot;
    const remainWords = words.length - index;
    const take = remainWords - (remainSlots - 1);
    if (take < 1) {
      return undefined;
    }
    groups.push(words.slice(index, index + take));
    index += take;
  }
  return index === words.length ? groups : undefined;
}

function mergeCandidateReading(parts: string[], nucleusAt: number | undefined) {
  const reading = parts.map((part) => part.replaceAll("'", "")).join("");
  if (nucleusAt === undefined) {
    return reading;
  }

  let offset = 0;
  for (const part of parts) {
    const quoteAt = quoteOffsetInWord(part);
    if (quoteAt !== undefined) {
      return insertQuote(reading, offset + quoteAt);
    }
    offset += part.replaceAll("'", "").length;
  }

  return insertQuote(reading, nucleusAt);
}

export function remountG2pKana(baselineKana: string, candidateKana: string) {
  const baseline = parseValidPhrases(baselineKana);
  if (!baseline || !candidateKana) {
    return undefined;
  }

  const slots = baseline.flatMap((phrase) =>
    phrase.words.map((word, wordIndex) => ({
      reading: word.replaceAll("'", ""),
      nucleusAt: quoteOffsetInWord(word),
      boundaryAfter: wordIndex === phrase.words.length - 1 ? phrase.boundaryAfter : "|",
    })),
  );
  const groups = groupCandidateWords(slots.length, extractG2pWords(candidateKana));
  if (!groups) {
    return undefined;
  }

  const remounted = slots
    .map((slot, index) => {
      const parts = groups[index] ?? [slot.reading];
      const word = mergeCandidateReading(parts, slot.nucleusAt);
      return `${word}${slot.boundaryAfter ?? ""}`;
    })
    .join("");

  if (syntaxOrTopologyErrors(baselineKana, remounted, "remount", true).length > 0) {
    return undefined;
  }
  return remounted;
}

export function syntaxOrTopologyErrors(
  baselineKana: string,
  candidateKana: string,
  ttsId: string,
  checkTopology: boolean,
): CorrectionError[] {
  const syntax = dslSyntaxErrors(candidateKana);
  if (syntax.length > 0) {
    const hint = hintDroppedPhraseBreaks(baselineKana, candidateKana);
    return syntax.map((message) => ({
      kind: "syntax",
      message: `${message}${hint}`,
    }));
  }
  if (!checkTopology) {
    return [];
  }
  const topology = automaticTopologyGuardError(baselineKana, candidateKana, ttsId);
  return topology ? [{ kind: "topology", message: topology }] : [];
}
