import { z } from "zod";
import {
  g2pItemSchema,
  voiceOptionSchema,
  voicepeakSynthesisSettingsSchema,
  voicevoxSynthesisSettingsSchema,
  voisonaSynthesisSettingsSchema,
} from "@/_schemas";

export const voicesResponseSchema = z.object({
  options: z.array(voiceOptionSchema),
});

export const ttsAnalyzeRequestSchema = z.object({
  text: z.string().min(1),
});

export const ttsAnalyzeResponseSchema = z.object({
  g2p: g2pItemSchema,
});

export const ttsSynthesizeRequestSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("voisona"),
    projectPath: z.string().min(1),
    text: z.string().min(1),
    g2p: g2pItemSchema.optional(),
    voiceName: z.string().min(1),
    voiceVersion: z.string().optional(),
    synthesisSettings: voisonaSynthesisSettingsSchema.nullish(),
  }),
  z.object({
    provider: z.literal("voicevox"),
    projectPath: z.string().min(1),
    text: z.string().min(1),
    g2p: g2pItemSchema.optional(),
    voiceName: z.string().min(1),
    voiceVersion: z.string().optional(),
    synthesisSettings: voicevoxSynthesisSettingsSchema.nullish(),
  }),
  z.object({
    provider: z.literal("voicepeak"),
    projectPath: z.string().min(1),
    text: z.string().min(1),
    g2p: g2pItemSchema.optional(),
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

export const synthesizeResponseSchema = z.object({
  audioSrc: z.string().min(1),
  outputPath: z.string().min(1),
  durationSec: z.number().nonnegative(),
});

export type SynthesizeResponse = z.infer<typeof synthesizeResponseSchema>;
