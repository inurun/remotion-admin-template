type SegmenterSegment = {
  segment: string;
};

type GraphemeSegmenter = {
  segment(input: string): Iterable<SegmenterSegment>;
};

type SegmenterConstructor = new (
  locales: string | string[] | undefined,
  options: { granularity: "grapheme" },
) => GraphemeSegmenter;

type IntlWithSegmenter = typeof Intl & {
  Segmenter?: SegmenterConstructor;
};

export type TextLine = {
  chars: string[];
  key: string;
  startIndex: number;
};

export function splitGraphemes(text: string) {
  const Segmenter = (Intl as IntlWithSegmenter).Segmenter;
  if (!Segmenter) {
    return Array.from(text);
  }

  return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(text), (part) => {
    return part.segment;
  });
}

export function getTextLines(text: string): TextLine[] {
  let cursor = 0;

  return text.split(/\r?\n/).map((line, lineIndex) => {
    const chars = splitGraphemes(line);
    const startIndex = cursor;
    cursor += chars.length + 1;

    return {
      chars,
      key: `${lineIndex}-${line}`,
      startIndex,
    };
  });
}
