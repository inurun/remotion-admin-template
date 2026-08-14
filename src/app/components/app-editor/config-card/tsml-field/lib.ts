export type TsmlAttribute = {
  name: string;
  value: string;
};

export type TsmlWord = {
  text: string;
  attributes: TsmlAttribute[];
};

export type TsmlPhrase = {
  words: TsmlWord[];
};

export type TsmlDocument = {
  phrases: TsmlPhrase[];
};

const COMBINING_MORA_CHARS = new Set([
  "ゃ",
  "ゅ",
  "ょ",
  "ぁ",
  "ぃ",
  "ぅ",
  "ぇ",
  "ぉ",
  "ゎ",
  "ャ",
  "ュ",
  "ョ",
  "ァ",
  "ィ",
  "ゥ",
  "ェ",
  "ォ",
  "ヮ",
  "ヵ",
  "ヶ",
]);

function parsePhraseElement(phraseElement: Element): TsmlPhrase {
  if (phraseElement.tagName !== "acoustic_phrase") {
    throw new Error("Unsupported TSML element inside <tsml>");
  }

  return {
    words: Array.from(phraseElement.children).map((wordElement) => {
      if (wordElement.tagName !== "word") {
        throw new Error("Unsupported TSML element inside <acoustic_phrase>");
      }

      return {
        text: wordElement.textContent ?? "",
        attributes: wordElement.getAttributeNames().map((name) => ({
          name,
          value: wordElement.getAttribute(name) ?? "",
        })),
      };
    }),
  };
}

export function parseTsml(input: string): TsmlDocument {
  const parser = new DOMParser();
  const document = parser.parseFromString(input, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("Invalid TSML");
  }

  const root = document.documentElement;
  if (!root || root.tagName !== "tsml") {
    throw new Error("TSML root element is missing");
  }

  return {
    phrases: Array.from(root.children).map(parsePhraseElement),
  };
}

export function cloneTsmlDocument(document: TsmlDocument): TsmlDocument {
  return {
    phrases: document.phrases.map((phrase) => ({
      words: phrase.words.map((word) => ({
        text: word.text,
        attributes: word.attributes.map((attribute) => ({ ...attribute })),
      })),
    })),
  };
}

export function getWordAttribute(word: TsmlWord, name: string) {
  return word.attributes.find((attribute) => attribute.name === name)?.value;
}

function setWordAttribute(word: TsmlWord, name: string, value: string) {
  const existing = word.attributes.find((attribute) => attribute.name === name);
  if (existing) {
    existing.value = value;
    return;
  }

  word.attributes.push({ name, value });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function serializeTsml(document: TsmlDocument) {
  return `<tsml>${document.phrases
    .map(
      (phrase) =>
        `<acoustic_phrase>${phrase.words
          .map((word) => {
            const attributes = word.attributes
              .map(({ name, value }) => `${name}="${escapeXml(value)}"`)
              .join(" ");

            return `<word${attributes ? ` ${attributes}` : ""}>${escapeXml(word.text)}</word>`;
          })
          .join("")}</acoustic_phrase>`,
    )
    .join("")}</tsml>`;
}

export function splitPronunciationIntoMoras(pronunciation: string) {
  return pronunciation
    .replaceAll(/[’']/g, "")
    .trim()
    .split("")
    .reduce<string[]>((moras, character) => {
      if (moras.length > 0 && COMBINING_MORA_CHARS.has(character)) {
        moras[moras.length - 1] += character;
        return moras;
      }

      moras.push(character);
      return moras;
    }, []);
}

export function toggleWordHlAtIndex(word: TsmlWord, index: number) {
  const current = getWordAttribute(word, "hl") ?? "";
  if (!isValidHlIndex(current, index)) {
    return;
  }

  setWordAttribute(word, "hl", getToggledHl(current, index));
}

function isValidHlIndex(current: string, index: number) {
  return index >= 0 && index < current.length;
}

function getToggledHl(current: string, index: number) {
  const nextValue = current[index] === "h" ? "l" : "h";
  return `${current.slice(0, index)}${nextValue}${current.slice(index + 1)}`;
}

export function setPhraseBoundaryChain(
  document: TsmlDocument,
  phraseIndex: number,
  wordIndex: number,
  chained: boolean,
) {
  const nextWord = document.phrases[phraseIndex]?.words[wordIndex + 1];
  if (nextWord) {
    setWordAttribute(nextWord, "chain", chained ? "1" : "0");
  }
}
