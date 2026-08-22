import { z } from "zod";
import {
  endcardPageMetaSchema,
  outroPageMetaSchema,
  pageTagsMetaSchema,
  transitionVariantSchema,
} from "@/_schemas/project/primitives";
import { savedTtsSchema } from "@/_schemas/project/tts";

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
    type: z.literal("eyecatch-text"),
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

export type SavedPage = z.infer<typeof savedPageSchema>;
export type SavedTransition = z.infer<typeof savedTransitionSchema>;
export type SavedSequenceItem = z.infer<typeof savedSequenceItemSchema>;
export type SavedEyecatchTextPage = Extract<SavedPage, { type: "eyecatch-text" }>;
export type SavedOutroPage = Extract<SavedPage, { type: "outro" }>;
export type SavedEndcardPage = Extract<SavedPage, { type: "endcard" }>;
