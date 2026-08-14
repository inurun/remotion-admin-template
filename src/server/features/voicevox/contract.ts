import { z } from "zod";
import { voiceOptionSchema, voicevoxSynthesisSettingsSchema } from "@/_schemas";
import { synthesizeResponseSchema } from "@/server/features/voisona/contract";

export const voicesResponseSchema = z.object({
  options: z.array(voiceOptionSchema),
});

export const voicevoxAnalyzeRequestSchema = z.object({
  text: z.string().min(1),
  voiceName: z.string().min(1),
});

export const voicevoxAnalyzeResponseSchema = z.object({
  analysis: z.string().min(1),
});

export const voicevoxSynthesizeRequestSchema = z.object({
  text: z.string().min(1),
  analysis: z.string().optional(),
  voiceName: z.string().min(1),
  voiceVersion: z.string().optional(),
  synthesisSettings: voicevoxSynthesisSettingsSchema.nullish(),
});

export type VoicevoxSynthesizeRequest = z.infer<typeof voicevoxSynthesizeRequestSchema>;

export { synthesizeResponseSchema };
