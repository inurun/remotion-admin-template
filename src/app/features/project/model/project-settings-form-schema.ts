import { z } from "zod";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";
import {
  bgmTrackSchema,
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
  voicePresets: z.array(voicePresetSchema).default(getDefaultVoicePresets),
});

export type ProjectSettingsFormValues = z.infer<typeof projectSettingsFormSchema>;
