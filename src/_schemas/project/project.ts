import { z } from "zod";
import {
  bgmTrackSchema,
  DEFAULT_VOICE_PRESETS,
  projectMetaSchema,
  voicePresetSchema,
} from "@/_schemas/project/primitives";
import { savedSequenceItemSchema } from "@/_schemas/project/page";

export const savedProjectSchema = z.object({
  meta: projectMetaSchema,
  pages: z.array(savedSequenceItemSchema),
  bgm: z.array(bgmTrackSchema).default([]),
  voicePresets: z.record(z.string(), voicePresetSchema).default(DEFAULT_VOICE_PRESETS),
});

export type SavedProject = z.infer<typeof savedProjectSchema>;
export type SavedProjectSettings = Pick<SavedProject, "meta" | "bgm" | "voicePresets">;
