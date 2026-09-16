import { z } from "zod";
import {
  bgmTrackSchema,
  DEFAULT_VOICE_PRESETS,
  projectNiconicoMetaSchema,
  voicePresetSchema,
  weatherForecastsSchema,
} from "@/_schemas/project/primitives";

export const projectSettingsFormSchema = z.object({
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
  voicePresets: z.record(z.string(), voicePresetSchema).default(DEFAULT_VOICE_PRESETS),
});

export type ProjectSettingsFormValues = z.infer<typeof projectSettingsFormSchema>;
