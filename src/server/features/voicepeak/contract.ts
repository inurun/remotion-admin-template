import { z } from "zod";
import { voiceOptionSchema, voicepeakSynthesisSettingsSchema } from "@/_schemas";
import { synthesizeResponseSchema } from "@/server/features/tts/contract";

export const voicesResponseSchema = z.object({
  options: z.array(voiceOptionSchema),
});

export const voicepeakSynthesizeRequestSchema = z.object({
  text: z.string().min(1),
  voiceName: z.string().min(1),
  voiceVersion: z.string().optional(),
  synthesisSettings: voicepeakSynthesisSettingsSchema.nullish(),
});

export type VoicepeakSynthesizeRequest = z.infer<typeof voicepeakSynthesizeRequestSchema>;

export { synthesizeResponseSchema };
