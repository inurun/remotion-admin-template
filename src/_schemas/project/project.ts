import { z } from "zod";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";
import {
  bgmTrackSchema,
  projectMetaSchema,
  voicePresetSchema,
} from "@/_schemas/project/primitives";
import { savedSequenceItemSchema } from "@/_schemas/project/page";

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

export type SavedProject = z.infer<typeof savedProjectSchema>;
export type SavedProjectSettings = Pick<SavedProject, "meta" | "bgm" | "voicePresets">;
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type CopyProjectRequest = z.infer<typeof copyProjectRequestSchema>;
export type ProjectFileSummary = z.infer<typeof projectFileSummarySchema>;
