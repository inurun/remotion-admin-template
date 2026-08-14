import { z } from "zod";
import { voiceOptionSchema, voisonaSynthesisSettingsSchema } from "@/_schemas";

export const voicesResponseSchema = z.object({
  options: z.array(voiceOptionSchema),
});

export const textAnalysisRequestSchema = z.object({
  text: z.string().min(1),
  language: z.string().default("ja_JP"),
});

export const textAnalysisResponseSchema = z.object({
  analysis: z.string().min(1),
  analyzedText: z.string().min(1).optional(),
});

export const synthesizeRequestSchema = z.object({
  text: z.string().min(1),
  analysis: z.string().optional(),
  analyzedText: z.string().optional(),
  voiceName: z.string().min(1),
  voiceVersion: z.string().optional(),
  synthesisSettings: voisonaSynthesisSettingsSchema.optional(),
});

export type SynthesizeRequest = z.infer<typeof synthesizeRequestSchema>;

export const synthesizeResponseSchema = z.object({
  audioSrc: z.string().min(1),
  outputPath: z.string().min(1),
  durationSec: z.number().nonnegative(),
});

export type SynthesizeResponse = z.infer<typeof synthesizeResponseSchema>;
