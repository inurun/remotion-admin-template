import { z } from "zod";
import { voiceOptionSchema, voicepeakSynthesisSettingsSchema } from "@/_schemas";
import { synthesizeResponseSchema } from "@/server/features/voisona/contract";

export const voicesResponseSchema = z.object({
  options: z.array(voiceOptionSchema),
});

export const voicepeakAnalyzeRequestSchema = z.object({
  text: z.string().min(1),
});

export const voicepeakAnalyzeResponseSchema = z.object({
  analysis: z.string().min(1),
});

export const voicepeakSynthesizeRequestSchema = z.object({
  text: z.string().min(1),
  analysis: z.string().optional(),
  voiceName: z.string().min(1),
  voiceVersion: z.string().optional(),
  synthesisSettings: voicepeakSynthesisSettingsSchema.nullish(),
});

export type VoicepeakSynthesizeRequest = z.infer<typeof voicepeakSynthesizeRequestSchema>;

export { synthesizeResponseSchema };
