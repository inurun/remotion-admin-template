import { z } from "zod";

const SMALL_KANA = new Set(["ャ", "ュ", "ョ", "ァ", "ィ", "ゥ", "ェ", "ォ", "ヮ", "ゎ"]);

export function toKatakana(value: string) {
  return Array.from(value, (char) => {
    const code = char.codePointAt(0) ?? 0;
    return code >= 0x3041 && code <= 0x3096 ? String.fromCodePoint(code + 0x60) : char;
  }).join("");
}

export function splitKanaMoras(value: string) {
  const moras: string[] = [];
  for (const char of toKatakana(value.trim())) {
    if (SMALL_KANA.has(char) && moras.length > 0 && !SMALL_KANA.has(moras.at(-1) ?? "")) {
      moras[moras.length - 1] += char;
    } else {
      moras.push(char);
    }
  }
  return moras;
}

export type DisplayPitch = "low" | "high";

export function pitchesForAccent(moraCount: number, accentNucleus: number): DisplayPitch[] {
  if (moraCount <= 0) return [];
  if (moraCount === 1) return ["high"];
  if (accentNucleus === 1) return ["high", ...Array<DisplayPitch>(moraCount - 1).fill("low")];
  return Array.from({ length: moraCount }, (_, index) => {
    if (index === 0) return "low";
    return accentNucleus === 0 || index < accentNucleus ? "high" : "low";
  });
}

export const dictionaryPartOfSpeechSchema = z.enum([
  "proper_noun",
  "common_noun",
  "adjective",
  "particle",
  "filler",
]);

const dictionaryMorphemeSchema = z.object({
  surface: z.string().min(1),
  reading: z.string().min(1),
  pronunciation: z.string().nullable().optional(),
  accent_nucleus: z.number().int().nonnegative(),
  part_of_speech: dictionaryPartOfSpeechSchema,
});

const dictionaryCandidateSchema = z.object({
  description: z.string().default(""),
  examples: z.array(z.string().min(1)).default([]),
  morphemes: z.array(dictionaryMorphemeSchema).min(1),
});

const fixedInputSchema = z.object({
  kind: z.literal("fixed"),
  surface: z.string().min(1),
  reading: z.string().min(1),
  pronunciation: z.string().nullable().optional(),
  accent_nucleus: z.number().int().nonnegative(),
  part_of_speech: dictionaryPartOfSpeechSchema,
  enabled: z.boolean(),
});

const contextualInputSchema = z.object({
  kind: z.literal("contextual"),
  surface: z.string().min(1),
  candidates: z.array(dictionaryCandidateSchema).min(2),
  enabled: z.boolean(),
});

export const dictionaryEntryInputSchema = z
  .discriminatedUnion("kind", [fixedInputSchema, contextualInputSchema])
  .superRefine((entry, ctx) => {
    if (entry.kind === "fixed") {
      const moraCount = splitKanaMoras(entry.pronunciation || entry.reading).length;
      if (entry.accent_nucleus > moraCount) {
        ctx.addIssue({ code: "custom", message: "Accent is outside the pronunciation" });
      }
      return;
    }
    entry.candidates.forEach((candidate, index) => {
      if (!candidate.description.trim() && candidate.examples.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Add a description or example",
          path: ["candidates", index],
        });
      }
      if (candidate.morphemes.map((item) => item.surface).join("") !== entry.surface) {
        ctx.addIssue({
          code: "custom",
          message: "Morpheme surfaces must match the entry surface",
          path: ["candidates", index, "morphemes"],
        });
      }
      candidate.morphemes.forEach((morpheme, morphemeIndex) => {
        const moraCount = splitKanaMoras(morpheme.pronunciation || morpheme.reading).length;
        if (morpheme.accent_nucleus > moraCount) {
          ctx.addIssue({
            code: "custom",
            message: "Accent is outside the pronunciation",
            path: ["candidates", index, "morphemes", morphemeIndex, "accent_nucleus"],
          });
        }
      });
    });
  });

export const dictionaryEntrySchema = z.discriminatedUnion("kind", [
  fixedInputSchema.extend({ id: z.number().int().positive() }),
  contextualInputSchema.extend({ id: z.number().int().positive() }),
]);

export const dictionaryListResponseSchema = z.object({
  revision: z.number().int().nonnegative(),
  entries: z.array(dictionaryEntrySchema),
});

export const dictionaryMutationResponseSchema = z.object({
  revision: z.number().int().nonnegative(),
  entry: dictionaryEntrySchema,
});

export type DictionaryEntryInput = z.infer<typeof dictionaryEntryInputSchema>;
export type DictionaryEntry = z.infer<typeof dictionaryEntrySchema>;
export type DictionaryListResponse = z.infer<typeof dictionaryListResponseSchema>;
export type DictionaryMutationResponse = z.infer<typeof dictionaryMutationResponseSchema>;
export type DictionaryPartOfSpeech = z.infer<typeof dictionaryPartOfSpeechSchema>;
export type DictionaryMorpheme = z.infer<typeof dictionaryMorphemeSchema>;
export type DictionaryCandidate = z.infer<typeof dictionaryCandidateSchema>;
