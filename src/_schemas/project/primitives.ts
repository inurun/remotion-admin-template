import { z } from "zod";
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

export const avatarSettingsSchema = z.object({
  base: z.string().min(1),
  eyes: z.string().min(1),
  mouth: z.string().min(1),
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

export const pageTypeSchema = z.enum(["intro", "eyecatch-text", "main", "outro", "endcard"]);
export const transitionVariantSchema = z.enum(["slide"]);

const weatherLocationSchema = z.enum(WEATHER_LOCATION_IDS);

const weatherConditionSchema = z.enum(["clear", "cloudy", "rain", "storm", "snow"]);

export const weatherForecastSchema = z.object({
  temperatureC: z.number(),
  precipitationProbability: z.number().int().min(0).max(100),
  condition: weatherConditionSchema,
});

export const weatherForecastsSchema = z
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

export const pageTagsMetaSchema = z
  .object({
    tags: z.array(z.string().trim().min(1)).default([]),
  })
  .default({ tags: [] });

export const outroPageMetaSchema = z
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

export const endcardPageMetaSchema = z
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

export const bgmTrackSchema = z.object({
  src: z.string(),
  startSec: z.number().nullable().default(null),
  endSec: z.number().nullable().default(null),
  fadeIn: z.boolean().default(false),
  fadeOut: z.boolean().default(false),
  volume: z.number().min(0).max(1).default(1),
});

export const projectNiconicoMetaSchema = z
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

const projectMetaFieldsSchema = z.object({
  title: z.string().default("project"),
  description: z.string().default(""),
  width: z.number().int().positive().default(1920),
  height: z.number().int().positive().default(1080),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
  weather: weatherForecastsSchema,
  niconico: projectNiconicoMetaSchema,
});

export const projectMetaSchema = projectMetaFieldsSchema
  .default(getDefaultProjectMeta())
  .transform((meta) => normalizeProjectMeta(meta));

export type BgmTrack = z.infer<typeof bgmTrackSchema>;
export type VoisonaSynthesisSettings = z.infer<typeof voisonaSynthesisSettingsSchema>;
export type VoicevoxSynthesisSettings = z.infer<typeof voicevoxSynthesisSettingsSchema>;
export type VoicepeakSynthesisSettings = z.infer<typeof voicepeakSynthesisSettingsSchema>;
export type AvatarSettings = z.infer<typeof avatarSettingsSchema>;
export type VoiceOption = z.infer<typeof voiceOptionSchema>;
export type VoicePreset = z.infer<typeof voicePresetSchema>;
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
