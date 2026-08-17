import { z } from "zod";

const g2pPitchSchema = z.enum(["low", "high"]);
const g2pBoundarySchema = z.enum(["none", "pause", "question", "exclamation"]);
const g2pWarningCodeSchema = z.enum(["unknown_word", "ignored_token"]);

const g2pSourceSpanSchema = z.object({
  start_utf16: z.number().int().nonnegative(),
  end_utf16: z.number().int().nonnegative(),
});

const g2pMoraSchema = z.object({
  text: z.string(),
  pitch: g2pPitchSchema,
});

const g2pWordMetadataSchema = z.object({
  orig: z.string(),
  read: z.string(),
  pos: z.string(),
  pos_group1: z.string(),
  pos_group2: z.string(),
  pos_group3: z.string(),
  ctype: z.string(),
  cform: z.string(),
  is_unknown: z.boolean(),
  is_ignored: z.boolean(),
});

const g2pWordSchema = z.object({
  surface: z.string(),
  chain: z.boolean(),
  moras: z.array(g2pMoraSchema),
  metadata: g2pWordMetadataSchema,
});

const g2pSegmentSchema = z.object({
  words: z.array(g2pWordSchema),
  boundary: g2pBoundarySchema,
});

const g2pWarningLocationSchema = z.object({
  segment_index: z.number().int().nonnegative(),
  word_index: z.number().int().nonnegative(),
});

const g2pWarningSchema = z.object({
  code: g2pWarningCodeSchema,
  location: g2pWarningLocationSchema.nullable().optional(),
  source_span: g2pSourceSpanSchema.nullable().optional(),
});

function isSourceSpanInsideText(text: string, span: { start_utf16: number; end_utf16: number }) {
  return span.start_utf16 <= span.end_utf16 && span.end_utf16 <= text.length;
}

export const g2pItemSchema = z
  .object({
    text: z.string(),
    segments: z.array(g2pSegmentSchema),
    warnings: z.array(g2pWarningSchema),
  })
  .superRefine((item, ctx) => {
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
  });

export type G2pItem = z.infer<typeof g2pItemSchema>;
export type G2pPitch = z.infer<typeof g2pPitchSchema>;
export type G2pBoundary = z.infer<typeof g2pBoundarySchema>;
export type G2pSourceSpan = z.infer<typeof g2pSourceSpanSchema>;
