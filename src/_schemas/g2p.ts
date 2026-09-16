import { z } from "zod";

const g2pWarningCodeSchema = z.enum(["unknown_word", "ignored_token"]);

const g2pSourceSpanSchema = z.object({
  start_utf16: z.number().int().nonnegative(),
  end_utf16: z.number().int().nonnegative(),
});

const g2pWarningSchema = z.object({
  code: g2pWarningCodeSchema,
  source_span: g2pSourceSpanSchema.nullable().optional(),
});

const BOUNDARY_CHARS = new Set(["/", "、", "？", "！"]);

function isSourceSpanInsideText(text: string, span: { start_utf16: number; end_utf16: number }) {
  return span.start_utf16 <= span.end_utf16 && span.end_utf16 <= text.length;
}

export function listG2pPronunciationWords(kana: string): string[] {
  const words: string[] = [];
  let start = 0;

  for (let index = 0; index <= kana.length; index += 1) {
    const char = kana[index];
    const atBoundary = char !== undefined && BOUNDARY_CHARS.has(char);
    const atEnd = index === kana.length;
    if (!atBoundary && !atEnd) {
      continue;
    }

    const body = kana.slice(start, index);
    if (atEnd && !body && words.length > 0) {
      break;
    }

    for (const word of body.split("|")) {
      if (word.replaceAll("'", "").length > 0) {
        words.push(word);
      }
    }

    if (atEnd) {
      break;
    }
    start = index + 1;
  }

  return words;
}

export function countG2pPronunciationWords(kana: string) {
  return listG2pPronunciationWords(kana).length;
}

const g2pItemFields = {
  text: z.string(),
  kana: z.string(),
  warnings: z.array(g2pWarningSchema).default([]),
};

function refineG2pWarnings(
  item: { text: string; warnings: z.infer<typeof g2pWarningSchema>[] },
  ctx: z.RefinementCtx,
) {
  for (const [index, warning] of item.warnings.entries()) {
    if (warning.source_span == null) {
      continue;
    }
    if (!isSourceSpanInsideText(item.text, warning.source_span)) {
      ctx.addIssue({
        code: "custom",
        message: "source_span is outside text",
        path: ["warnings", index, "source_span"],
      });
    }
  }
}

export const dictionaryWordSchema = z.object({
  word_index: z.number().int().nonnegative(),
  kind: z.enum(["fixed", "contextual"]),
});

export const dictionaryWordsSchema = z.array(dictionaryWordSchema).nullable();

function refineDictionaryWords(
  item: { kana: string; dictionary_words?: z.infer<typeof dictionaryWordsSchema> },
  ctx: z.RefinementCtx,
) {
  const words = item.dictionary_words;
  if (words == null) {
    return;
  }

  const wordCount = countG2pPronunciationWords(item.kana);
  let previousIndex: number | undefined;
  for (const [index, word] of words.entries()) {
    if (previousIndex !== undefined && word.word_index <= previousIndex) {
      ctx.addIssue({
        code: "custom",
        message: "dictionary_words must be unique and sorted by word_index",
        path: ["dictionary_words", index, "word_index"],
      });
    }
    if (word.word_index >= wordCount) {
      ctx.addIssue({
        code: "custom",
        message: "word_index is outside baseline pronunciation words",
        path: ["dictionary_words", index, "word_index"],
      });
    }
    previousIndex = word.word_index;
  }
}

export const g2pItemSchema = z.object(g2pItemFields).superRefine(refineG2pWarnings);

export const analyzeItemSchema = z
  .object({
    ...g2pItemFields,
    dictionary_words: dictionaryWordsSchema,
  })
  .superRefine((item, ctx) => {
    refineG2pWarnings(item, ctx);
    refineDictionaryWords(item, ctx);
  });

export const storedG2pItemSchema = z
  .object({
    ...g2pItemFields,
    dictionary_words: dictionaryWordsSchema.optional(),
  })
  .superRefine((item, ctx) => {
    refineG2pWarnings(item, ctx);
    refineDictionaryWords(item, ctx);
  });

export type G2pItem = z.infer<typeof g2pItemSchema>;
export type AnalyzeItem = z.infer<typeof analyzeItemSchema>;
export type StoredG2pItem = z.infer<typeof storedG2pItemSchema>;
export type DictionaryWord = z.infer<typeof dictionaryWordSchema>;
export type G2pSourceSpan = z.infer<typeof g2pSourceSpanSchema>;
export type G2pWarning = z.infer<typeof g2pWarningSchema>;
