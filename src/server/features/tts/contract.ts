import { z } from "zod";
import {
  voiceOptionSchema,
  voicepeakSynthesisSettingsSchema,
  voicevoxSynthesisSettingsSchema,
  voisonaSynthesisSettingsSchema,
} from "@/_schemas";
import { synthesizeResponseSchema } from "@/server/features/voisona/contract";

export const voicesResponseSchema = z.object({
  options: z.array(voiceOptionSchema),
});

export const ttsAnalyzeRequestSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("voisona"),
    text: z.string().min(1),
    language: z.string().default("ja_JP"),
  }),
  z.object({
    provider: z.literal("voicevox"),
    text: z.string().min(1),
    voiceName: z.string().min(1),
  }),
  z.object({
    provider: z.literal("voicepeak"),
    text: z.string().min(1),
  }),
]);

export const ttsAnalyzeResponseSchema = z.object({
  analysis: z.string().min(1),
});

export const ttsSynthesizeRequestSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("voisona"),
    projectPath: z.string().min(1),
    text: z.string().min(1),
    analysis: z.string().optional(),
    voiceName: z.string().min(1),
    voiceVersion: z.string().optional(),
    synthesisSettings: voisonaSynthesisSettingsSchema.nullish(),
  }),
  z.object({
    provider: z.literal("voicevox"),
    projectPath: z.string().min(1),
    text: z.string().min(1),
    analysis: z.string().optional(),
    voiceName: z.string().min(1),
    voiceVersion: z.string().optional(),
    synthesisSettings: voicevoxSynthesisSettingsSchema.nullish(),
  }),
  z.object({
    provider: z.literal("voicepeak"),
    projectPath: z.string().min(1),
    text: z.string().min(1),
    analysis: z.string().optional(),
    voiceName: z.string().min(1),
    voiceVersion: z.string().optional(),
    synthesisSettings: voicepeakSynthesisSettingsSchema.nullish(),
  }),
]);

export const ttsClearCacheRequestSchema = z.object({
  projectPath: z.string().min(1),
});

export const ttsClearCacheResponseSchema = z.object({
  ok: z.literal(true),
});

export { synthesizeResponseSchema };
