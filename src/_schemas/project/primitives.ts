import { z } from "zod";

export const avatarOptions = {
  demo: {
    base: ["normal"],
    eyes: ["opened", "shaded-opened"],
    mouth: ["opened", "closed"],
  },
} as const;

export type AvatarType = keyof typeof avatarOptions;

export const WEATHER_LOCATION_IDS = ["tokyo", "osaka"] as const;

export const WEATHER_LOCATION_LABELS = {
  tokyo: "Tokyo",
  osaka: "Osaka",
} as const;

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

export function voicePresetId(voice: {
  provider: string;
  voiceName: string;
  voiceVersion?: string;
}) {
  return `${voice.provider}::${voice.voiceName}::${voice.voiceVersion ?? ""}`;
}

export const pageTypeSchema = z.enum(["intro", "eyecatch-text", "main", "outro", "endcard"]);
export const transitionVariantSchema = z.enum(["slide"]);

const weatherLocationSchema = z.enum(WEATHER_LOCATION_IDS);

export const weatherConditionSchema = z.enum(["clear", "cloudy", "rain", "storm", "snow"]);

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
  userId: z.number().int().optional(),
  identityKey: z.string().min(1),
  introductionCount: z.number().int().nonnegative().default(0),
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
    tags: z.array(z.string().trim().min(1)).max(6).default([]),
  })
  .default({
    title: "",
    description: "",
    thumbnailTime: "00:00.000",
    parentWorkIds: [],
    tags: [],
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

export const DEFAULT_PROJECT_META = {
  title: "project",
  description: "",
  width: 1920,
  height: 1080,
  weather: {},
  niconico: {
    title: "",
    description: "",
    thumbnailTime: "00:00.000",
    parentWorkIds: [] as string[],
    tags: [] as string[],
  },
};

export const projectMetaSchema = projectMetaFieldsSchema.default(DEFAULT_PROJECT_META);

const DEFAULT_VOICEVOX_TIMING = {
  prePhonemeLength: 0,
  postPhonemeLength: 0,
  pauseLengthScale: 0.5,
} as const;

export const KASANE_TETO_NARRATOR = "Kasane Teto";

export const DEFAULT_KASANE_TETO_EMOTION = {
  "teto-overactive": 10,
  "teto-low-key": 20,
  "teto-whisper": 20,
  "teto-powerful": 10,
  "teto-sweet": 30,
} as const;

export const DEFAULT_VOICEPEAK_SPEED = 90;
export const DEFAULT_VOICEPEAK_PITCH = 0;

export const DEFAULT_VOICE_PRESETS = {
  "voicevox::3::": {
    provider: "voicevox" as const,
    voiceName: "3",
    synthesisSettings: {
      speedScale: 1.4,
      pitchScale: -0.01,
      intonationScale: 0.9,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  "voicevox::14::": {
    provider: "voicevox" as const,
    voiceName: "14",
    synthesisSettings: {
      speedScale: 1.3,
      intonationScale: 1,
      pitchScale: -0.02,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  "voicevox::46::": {
    provider: "voicevox" as const,
    voiceName: "46",
    synthesisSettings: {
      speedScale: 1.3,
      pitchScale: -0.02,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  "voicevox::43::": {
    provider: "voicevox" as const,
    voiceName: "43",
    synthesisSettings: {
      speedScale: 1.3,
      intonationScale: 1.2,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  "voicevox::113::": {
    provider: "voicevox" as const,
    voiceName: "113",
    synthesisSettings: {
      speedScale: 1.3,
      pitchScale: 0.01,
      intonationScale: 0.95,
      ...DEFAULT_VOICEVOX_TIMING,
    },
  },
  "voicepeak::Kasane Teto::": {
    provider: "voicepeak" as const,
    voiceName: KASANE_TETO_NARRATOR,
    synthesisSettings: {
      speed: DEFAULT_VOICEPEAK_SPEED,
      pitch: DEFAULT_VOICEPEAK_PITCH,
      emotion: { ...DEFAULT_KASANE_TETO_EMOTION },
    },
  },
  "voisona::futaba-minato_ja_JP::2.0.2": {
    provider: "voisona" as const,
    voiceName: "futaba-minato_ja_JP",
    voiceVersion: "2.0.2",
    synthesisSettings: {
      speed: 1.4,
      huskiness: 0.7,
      style_weights: [0, 1, 0, 0.2, 0, 1],
    },
  },
};

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
