import { z } from "zod";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";
import { getDefaultProjectMeta, normalizeProjectMeta } from "@/_shared/project/project-meta";
import { WEATHER_LOCATION_IDS } from "@/features/weather/weather-locations";

export { avatarOptions, type AvatarType } from "@/_shared/lib/avatar/avatar-options";

export const voiceProviderSchema = z.enum(["voisona", "voicevox", "voicepeak"]);

export const voisonaSynthesisSettingsSchema = z.object({
  alp: z.number().optional(),
  huskiness: z.number().optional(),
  intonation: z.number().optional(),
  pitch: z.number().optional(),
  speed: z.number().optional(),
  volume: z.number().optional(),
  style_weights: z.array(z.number()).optional(),
});

export const voicevoxSynthesisSettingsSchema = z.object({
  speedScale: z.number().optional(),
  pitchScale: z.number().optional(),
  intonationScale: z.number().optional(),
  volumeScale: z.number().optional(),
  pauseLength: z.number().nullable().optional(),
  prePhonemeLength: z.number().optional(),
  postPhonemeLength: z.number().optional(),
  pauseLengthScale: z.number().optional(),
});

export const voicepeakSynthesisSettingsSchema = z.object({
  speed: z.number().min(50).max(200).optional(),
  pitch: z.number().min(-300).max(300).optional(),
  emotion: z.record(z.string(), z.number()).optional(),
});

const avatarSettingsSchema = z.object({
  base: z.string().min(1),
  eyes: z.string().min(1),
  mouth: z.string().min(1),
});

const ttsSpeechSchema = z.object({
  analysis: z.string().optional(),
});

export const voiceOptionSchema = z.object({
  provider: voiceProviderSchema,
  voiceName: z.string().min(1),
  voiceVersion: z.string().optional(),
  displayName: z.string().min(1),
});

const voicePresetBaseSchema = {
  voiceName: z.string().min(1),
  voiceVersion: z.string().optional(),
};

export const voicePresetSchema = z.discriminatedUnion("provider", [
  z.object({
    ...voicePresetBaseSchema,
    provider: z.literal("voisona"),
    synthesisSettings: voisonaSynthesisSettingsSchema,
  }),
  z.object({
    ...voicePresetBaseSchema,
    provider: z.literal("voicevox"),
    synthesisSettings: voicevoxSynthesisSettingsSchema,
  }),
  z.object({
    ...voicePresetBaseSchema,
    provider: z.literal("voicepeak"),
    synthesisSettings: voicepeakSynthesisSettingsSchema,
  }),
]);

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

export const draftTtsSchema = z.discriminatedUnion("provider", [
  ttsBaseSchema.extend({
    provider: z.literal("voisona"),
    synthesisSettings: voisonaSynthesisSettingsSchema.nullish(),
  }),
  ttsBaseSchema.extend({
    provider: z.literal("voicevox"),
    synthesisSettings: voicevoxSynthesisSettingsSchema.nullish(),
  }),
  ttsBaseSchema.extend({
    provider: z.literal("voicepeak"),
    synthesisSettings: voicepeakSynthesisSettingsSchema.nullish(),
  }),
]);

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

export const pageTypeSchema = z.enum(["intro", "main", "outro", "endcard"]);
export const transitionVariantSchema = z.enum(["slide"]);

const weatherLocationSchema = z.enum(WEATHER_LOCATION_IDS);

const weatherConditionSchema = z.enum(["clear", "cloudy", "rain", "storm", "snow"]);

const weatherForecastSchema = z.object({
  temperatureC: z.number(),
  precipitationProbability: z.number().int().min(0).max(100),
  condition: weatherConditionSchema,
});

const weatherForecastsSchema = z
  .partialRecord(weatherLocationSchema, weatherForecastSchema)
  .default({});

const ogpTextSchema = z.string().default("");
const ogpUrlSchema = z.string().nullable().default(null);

export const ogpMetadataSchema = z.object({
  url: z.string().url(),
  title: ogpTextSchema,
  description: ogpTextSchema,
  image: ogpUrlSchema,
  logo: ogpUrlSchema,
  favicon: ogpUrlSchema,
  author: ogpTextSchema,
  date: ogpTextSchema,
  publisher: ogpTextSchema,
  lang: ogpTextSchema,
  audio: ogpUrlSchema,
  video: ogpUrlSchema,
  iframe: ogpTextSchema,
  feed: ogpTextSchema,
});

export const ogpMetadataKeys = [
  "url",
  "title",
  "description",
  "image",
  "logo",
  "favicon",
  "author",
  "date",
  "publisher",
  "lang",
  "audio",
  "video",
  "iframe",
  "feed",
] as const satisfies ReadonlyArray<keyof z.infer<typeof ogpMetadataSchema>>;

export const outroBlockSchema = ogpMetadataSchema.extend({
  id: z.string().min(1),
  impression: ogpTextSchema,
});

const pageTagsMetaSchema = z
  .object({
    tags: z.array(z.string().trim().min(1)).default([]),
  })
  .default({ tags: [] });

const outroPageMetaSchema = z
  .object({
    tags: z.array(z.string().trim().min(1)).default([]),
    blocks: z.array(outroBlockSchema).default([]),
  })
  .default({ tags: [], blocks: [] });

export const endcardCreditSchema = z.object({
  id: z.string().min(1),
  title: z.string().default(""),
  url: z.string().default(""),
});

export const endcardAdvertiserSchema = z.object({
  id: z.string().min(1),
  name: z.string().default(""),
  message: z.string().default(""),
});

export const endcardMessageSchema = z.object({
  id: z.string().min(1),
  text: z.string().default(""),
});

const endcardPageMetaSchema = z
  .object({
    tags: z.array(z.string().trim().min(1)).default([]),
    nicoadSource: z.string().default(""),
    credits: z.array(endcardCreditSchema).default([]),
    advertisers: z.array(endcardAdvertiserSchema).default([]),
    messages: z.array(endcardMessageSchema).default([]),
  })
  .default({
    tags: [],
    nicoadSource: "",
    credits: [],
    advertisers: [],
    messages: [],
  });

const draftPageSharedSchema = {
  id: z.string().min(1),
  title: z.string(),
  padBeforeSec: z.number().nonnegative(),
  padAfterSec: z.number().nonnegative(),
  richText: z.string().nullable(),
  tts: z.array(draftTtsSchema),
};

export const draftPageSchema = z.discriminatedUnion("type", [
  z.object({
    ...draftPageSharedSchema,
    type: z.literal("intro"),
    meta: pageTagsMetaSchema,
  }),
  z.object({
    ...draftPageSharedSchema,
    type: z.literal("main"),
    meta: pageTagsMetaSchema,
  }),
  z.object({
    ...draftPageSharedSchema,
    type: z.literal("outro"),
    meta: outroPageMetaSchema,
  }),
  z.object({
    ...draftPageSharedSchema,
    type: z.literal("endcard"),
    meta: endcardPageMetaSchema,
  }),
]);

export const draftTransitionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("transition"),
  variant: transitionVariantSchema,
});

export const draftSequenceItemSchema = z.union([draftPageSchema, draftTransitionSchema]);

const bgmTrackSchema = z.object({
  src: z.string(),
  startSec: z.number().nullable().default(null),
  endSec: z.number().nullable().default(null),
  fadeIn: z.boolean().default(false),
  fadeOut: z.boolean().default(false),
  volume: z.number().min(0).max(1).default(1),
});

const projectNiconicoMetaSchema = z
  .object({
    title: z.string().default(""),
    description: z.string().default(""),
    thumbnailTime: z.string().default("00:00.000"),
    parentWorkIds: z.array(z.string()).default([]),
  })
  .default({
    title: "",
    description: "",
    thumbnailTime: "00:00.000",
    parentWorkIds: [],
  });

const projectMetaSchema = z
  .object({
    title: z.string().default("project"),
    description: z.string().default(""),
    width: z.number().int().positive().default(1920),
    height: z.number().int().positive().default(1080),
    updatedAt: z.iso.datetime({ offset: true }).optional(),
    weather: weatherForecastsSchema,
    niconico: projectNiconicoMetaSchema,
  })
  .default(getDefaultProjectMeta())
  .transform((meta) => normalizeProjectMeta(meta));

export const draftProjectSchema = z.object({
  meta: projectMetaSchema,
  pages: z.array(draftSequenceItemSchema),
  bgm: z.array(bgmTrackSchema).default([]),
  voicePresets: z.array(voicePresetSchema).default(getDefaultVoicePresets),
});

const savedPageSharedSchema = {
  id: z.string().min(1),
  title: z.string().default(""),
  padBeforeSec: z.number().nonnegative(),
  padAfterSec: z.number().nonnegative(),
  durationSec: z.number().nonnegative(),
  richText: z.string().nullable(),
  tts: z.array(savedTtsSchema),
};

export const savedPageSchema = z.discriminatedUnion("type", [
  z.object({
    ...savedPageSharedSchema,
    type: z.literal("intro"),
    meta: pageTagsMetaSchema,
  }),
  z.object({
    ...savedPageSharedSchema,
    type: z.literal("main"),
    meta: pageTagsMetaSchema,
  }),
  z.object({
    ...savedPageSharedSchema,
    type: z.literal("outro"),
    meta: outroPageMetaSchema,
  }),
  z.object({
    ...savedPageSharedSchema,
    type: z.literal("endcard"),
    meta: endcardPageMetaSchema,
  }),
]);

export const savedTransitionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("transition"),
  variant: transitionVariantSchema,
});

export const savedSequenceItemSchema = z.union([savedPageSchema, savedTransitionSchema]);

export const savedProjectSchema = z.object({
  meta: projectMetaSchema,
  pages: z.array(savedSequenceItemSchema),
  bgm: z.array(bgmTrackSchema).default([]),
  voicePresets: z.array(voicePresetSchema).default(getDefaultVoicePresets),
});

export const createProjectRequestSchema = z.object({
  projectPath: z.string().min(1),
});

export const copyProjectRequestSchema = z.object({
  sourceProjectPath: z.string().min(1),
  targetProjectPath: z.string().min(1),
});

export const projectFileSummarySchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  segments: z.array(z.string().min(1)),
  updatedAt: z.number().int().nonnegative(),
});

export type BgmTrack = z.infer<typeof bgmTrackSchema>;
export type VoisonaSynthesisSettings = z.infer<typeof voisonaSynthesisSettingsSchema>;
export type VoicevoxSynthesisSettings = z.infer<typeof voicevoxSynthesisSettingsSchema>;
export type VoicepeakSynthesisSettings = z.infer<typeof voicepeakSynthesisSettingsSchema>;
export type AvatarSettings = z.infer<typeof avatarSettingsSchema>;
export type VoiceOption = z.infer<typeof voiceOptionSchema>;
export type VoicePreset = z.infer<typeof voicePresetSchema>;
export type DraftTts = z.infer<typeof draftTtsSchema>;
export type SavedTts = z.infer<typeof savedTtsSchema>;
export type PageType = z.infer<typeof pageTypeSchema>;
export type TransitionVariant = z.infer<typeof transitionVariantSchema>;
export type OgpMetadata = z.infer<typeof ogpMetadataSchema>;
export type OutroBlock = z.infer<typeof outroBlockSchema>;
export type EndcardCredit = z.infer<typeof endcardCreditSchema>;
export type EndcardAdvertiser = z.infer<typeof endcardAdvertiserSchema>;
export type EndcardMessage = z.infer<typeof endcardMessageSchema>;
export type WeatherLocation = z.infer<typeof weatherLocationSchema>;
export type WeatherCondition = z.infer<typeof weatherConditionSchema>;
export type WeatherForecast = z.infer<typeof weatherForecastSchema>;
export type WeatherForecasts = z.infer<typeof weatherForecastsSchema>;
export type DraftPage = z.infer<typeof draftPageSchema>;
export type DraftTransition = z.infer<typeof draftTransitionSchema>;
export type DraftSequenceItem = z.infer<typeof draftSequenceItemSchema>;
export type SavedPage = z.infer<typeof savedPageSchema>;
export type SavedTransition = z.infer<typeof savedTransitionSchema>;
export type SavedSequenceItem = z.infer<typeof savedSequenceItemSchema>;
export type DraftOutroPage = Extract<DraftPage, { type: "outro" }>;
export type SavedOutroPage = Extract<SavedPage, { type: "outro" }>;
export type DraftEndcardPage = Extract<DraftPage, { type: "endcard" }>;
export type SavedEndcardPage = Extract<SavedPage, { type: "endcard" }>;
export type DraftProject = z.infer<typeof draftProjectSchema>;
export type DraftProjectInput = z.input<typeof draftProjectSchema>;
export type SavedProject = z.infer<typeof savedProjectSchema>;
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type CopyProjectRequest = z.infer<typeof copyProjectRequestSchema>;
export type ProjectFileSummary = z.infer<typeof projectFileSummarySchema>;
