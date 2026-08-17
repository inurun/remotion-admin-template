import { z } from "zod";
import { g2pItemSchema } from "@/_schemas/g2p";
import {
  avatarSettingsSchema,
  voicepeakSynthesisSettingsSchema,
  voicevoxSynthesisSettingsSchema,
  voisonaSynthesisSettingsSchema,
} from "@/_schemas/project/primitives";

const ttsFormSpeechSchema = z.object({
  g2p: g2pItemSchema.optional(),
});

const ttsFormBaseSchema = {
  id: z.string().min(1),
  text: z.string(),
  readText: z.string().optional(),
  voiceName: z.string().optional(),
  voiceVersion: z.string().optional(),
  padBeforeSec: z.number().default(0),
  padAfterSec: z.number().default(0),
  volume: z.number().min(0).max(1).default(1),
  speech: ttsFormSpeechSchema.optional(),
  avatar: avatarSettingsSchema.optional(),
};

export const ttsFormSchema = z.discriminatedUnion("provider", [
  z.object({
    ...ttsFormBaseSchema,
    provider: z.literal("voisona"),
    synthesisSettings: voisonaSynthesisSettingsSchema.nullish(),
  }),
  z.object({
    ...ttsFormBaseSchema,
    provider: z.literal("voicevox"),
    synthesisSettings: voicevoxSynthesisSettingsSchema.nullish(),
  }),
  z.object({
    ...ttsFormBaseSchema,
    provider: z.literal("voicepeak"),
    synthesisSettings: voicepeakSynthesisSettingsSchema.nullish(),
  }),
]);

export type TtsFormValues = z.infer<typeof ttsFormSchema>;
