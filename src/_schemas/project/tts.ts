import { z } from "zod";
import { g2pItemSchema } from "@/_schemas/g2p";
import {
  avatarSettingsSchema,
  voicepeakSynthesisSettingsSchema,
  voisonaSynthesisSettingsSchema,
  voicevoxSynthesisSettingsSchema,
} from "@/_schemas/project/primitives";

const ttsSpeechSchema = z.object({
  g2p: g2pItemSchema.optional(),
});

const ttsBaseSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  readText: z.string().optional(),
  voiceName: z.string().optional(),
  voiceVersion: z.string().optional(),
  padBeforeSec: z.number().default(0),
  padAfterSec: z.number().default(0),
  volume: z.number().min(0).max(1).default(1),
  speech: ttsSpeechSchema.optional(),
  avatar: avatarSettingsSchema.optional(),
});

export const savedTtsSchema = z.discriminatedUnion("provider", [
  ttsBaseSchema.extend({
    provider: z.literal("voisona"),
    synthesisSettings: voisonaSynthesisSettingsSchema.nullish(),
    durationSec: z.number().nonnegative(),
    audio: z.object({
      src: z.string(),
    }),
    speech: ttsSpeechSchema.default({}),
  }),
  ttsBaseSchema.extend({
    provider: z.literal("voicevox"),
    synthesisSettings: voicevoxSynthesisSettingsSchema.nullish(),
    durationSec: z.number().nonnegative(),
    audio: z.object({
      src: z.string(),
    }),
    speech: ttsSpeechSchema.default({}),
  }),
  ttsBaseSchema.extend({
    provider: z.literal("voicepeak"),
    synthesisSettings: voicepeakSynthesisSettingsSchema.nullish(),
    durationSec: z.number().nonnegative(),
    audio: z.object({
      src: z.string(),
    }),
    speech: ttsSpeechSchema.default({}),
  }),
]);

export type SavedTts = z.infer<typeof savedTtsSchema>;
