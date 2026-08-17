import { z } from "zod";
import {
  copyProjectRequestSchema,
  createProjectRequestSchema,
  projectFileSummarySchema,
  savedProjectSchema,
} from "@/_schemas";
import { g2pItemSchema } from "@/_schemas/g2p";
import {
  avatarSettingsSchema,
  bgmTrackSchema,
  endcardPageMetaSchema,
  outroPageMetaSchema,
  pageTagsMetaSchema,
  projectNiconicoMetaSchema,
  transitionVariantSchema,
  voicepeakSynthesisSettingsSchema,
  voicePresetSchema,
  voicevoxSynthesisSettingsSchema,
  voisonaSynthesisSettingsSchema,
  weatherForecastsSchema,
} from "@/_schemas/project/primitives";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";

const saveTtsSpeechSchema = z.object({
  g2p: g2pItemSchema.optional(),
});

const saveTtsBaseFields = {
  id: z.string().min(1),
  text: z.string(),
  readText: z.string().optional(),
  voiceName: z.string().optional(),
  voiceVersion: z.string().optional(),
  padBeforeSec: z.number().default(0),
  padAfterSec: z.number().default(0),
  volume: z.number().min(0).max(1).default(1),
  speech: saveTtsSpeechSchema.optional(),
  avatar: avatarSettingsSchema.optional(),
};

export const saveTtsItemSchema = z.discriminatedUnion("provider", [
  z.object({
    ...saveTtsBaseFields,
    provider: z.literal("voisona"),
    synthesisSettings: voisonaSynthesisSettingsSchema.nullish(),
  }),
  z.object({
    ...saveTtsBaseFields,
    provider: z.literal("voicevox"),
    synthesisSettings: voicevoxSynthesisSettingsSchema.nullish(),
  }),
  z.object({
    ...saveTtsBaseFields,
    provider: z.literal("voicepeak"),
    synthesisSettings: voicepeakSynthesisSettingsSchema.nullish(),
  }),
]);

const savePageSharedFields = {
  id: z.string().min(1),
  title: z.string(),
  padBeforeSec: z.number().nonnegative(),
  padAfterSec: z.number().nonnegative(),
  richText: z.string().nullable(),
  tts: z.array(saveTtsItemSchema),
};

export const savePageItemSchema = z.discriminatedUnion("type", [
  z.object({
    ...savePageSharedFields,
    type: z.literal("intro"),
    meta: pageTagsMetaSchema,
  }),
  z.object({
    ...savePageSharedFields,
    type: z.literal("main"),
    meta: pageTagsMetaSchema,
  }),
  z.object({
    ...savePageSharedFields,
    type: z.literal("outro"),
    meta: outroPageMetaSchema,
  }),
  z.object({
    ...savePageSharedFields,
    type: z.literal("endcard"),
    meta: endcardPageMetaSchema,
  }),
]);

export const saveTransitionItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal("transition"),
  variant: transitionVariantSchema,
});

export const saveSequenceItemSchema = z.union([savePageItemSchema, saveTransitionItemSchema]);

export const saveProjectSettingsSchema = z.object({
  meta: z.object({
    title: z.string(),
    description: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    updatedAt: z.iso.datetime({ offset: true }).optional(),
    weather: weatherForecastsSchema,
    niconico: projectNiconicoMetaSchema,
  }),
  bgm: z.array(bgmTrackSchema).default([]),
  voicePresets: z.array(voicePresetSchema).default(getDefaultVoicePresets),
});

export const saveProjectChangesRequestSchema = z.object({
  project: saveProjectSettingsSchema.optional(),
  upsertItems: z.array(saveSequenceItemSchema),
  removedItemIds: z.array(z.string().min(1)),
  sequenceOrder: z.array(z.string().min(1)).optional(),
  forceResynthesis: z.boolean().optional(),
});

export const saveProjectChangesResponseSchema = z.object({
  project: savedProjectSchema,
  updatedItemIds: z.array(z.string().min(1)),
});

export const projectContract = {
  list: {
    response: projectFileSummarySchema.array(),
  },
  create: {
    json: createProjectRequestSchema,
    response: projectFileSummarySchema,
  },
  copy: {
    json: copyProjectRequestSchema,
    response: projectFileSummarySchema,
  },
  get: {
    response: savedProjectSchema,
  },
  save: {
    json: saveProjectChangesRequestSchema,
    response: saveProjectChangesResponseSchema,
  },
};

export type SaveTtsItem = z.infer<typeof saveTtsItemSchema>;
export type SavePageItem = z.infer<typeof savePageItemSchema>;
export type SaveTransitionItem = z.infer<typeof saveTransitionItemSchema>;
export type SaveSequenceItem = z.infer<typeof saveSequenceItemSchema>;
export type SaveProjectSettings = z.infer<typeof saveProjectSettingsSchema>;
export type SaveProjectChangesRequest = z.infer<typeof saveProjectChangesRequestSchema>;
export type SaveProjectChangesResponse = z.infer<typeof saveProjectChangesResponseSchema>;

export function isSaveTransitionItem(item: SaveSequenceItem): item is SaveTransitionItem {
  return item.type === "transition";
}

export function isSavePageItem(item: SaveSequenceItem): item is SavePageItem {
  return item.type !== "transition";
}
