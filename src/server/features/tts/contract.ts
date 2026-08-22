import { z } from "zod";
import {
  g2pItemSchema,
  voiceOptionSchema,
  voiceProviderSchema,
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

export const ttsValidateRequestSchema = z.object({
  text: z.string().min(1),
  kana: z.string().min(1),
});

export const ttsValidateResponseSchema = z.object({
  g2p: g2pItemSchema,
});

const ttsLlmAnalysisRequestItemSchema = z.object({
  id: z.string().min(1),
  provider: voiceProviderSchema,
  text: z.string(),
  readText: z.string().optional(),
});

export const ttsLlmAnalysisRequestSchema = z
  .object({
    pageId: z.string().min(1),
    items: z.array(ttsLlmAnalysisRequestItemSchema),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      if (seen.has(item.id)) {
        ctx.addIssue({ code: "custom", message: "duplicate TTS id", path: ["items", index, "id"] });
      }
      seen.add(item.id);
    }
  });

const ttsLlmAnalysisResultSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["corrected", "unchanged", "skipped"]),
  baselineKana: z.string().optional(),
  correctedKana: z.string().optional(),
  reason: z.string().optional(),
  g2p: g2pItemSchema.optional(),
});

const ttsLlmUsageSchema = z.object({
  promptTokens: z.number().nonnegative(),
  completionTokens: z.number().nonnegative(),
  reasoningTokens: z.number().nonnegative(),
  cachedTokens: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
  costUsd: z.number().nonnegative(),
});

export const ttsLlmAnalysisResponseSchema = z.object({
  runId: z.string().min(1),
  logFile: z.string().min(1),
  requestId: z.string().optional(),
  model: z.string().min(1),
  provider: z.string().min(1),
  actualProvider: z.string().optional(),
  timings: z.object({
    haqumeiBaselineMs: z.number().nonnegative(),
    openRouterMs: z.number().nonnegative(),
    haqumeiValidationMs: z.number().nonnegative(),
    totalMs: z.number().nonnegative(),
  }),
  usage: ttsLlmUsageSchema,
  costPerTtsUsd: z.number().nonnegative(),
  monthlyUsdAt3000Tts: z.number().nonnegative(),
  items: z.array(ttsLlmAnalysisResultSchema),
});

export type TtsLlmAnalysisRequest = z.infer<typeof ttsLlmAnalysisRequestSchema>;
export type TtsLlmAnalysisResponse = z.infer<typeof ttsLlmAnalysisResponseSchema>;

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
