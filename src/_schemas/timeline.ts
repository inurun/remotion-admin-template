import { z } from "zod";

export const SEQUENCE_TRACK_ID = "sequence";

export type SavedTimelineClip = {
  id: string;
  startSec: number;
  durationSec: number;
  clips: SavedTimelineClip[];
};

export const savedTimelineClipSchema: z.ZodType<SavedTimelineClip> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    startSec: z.number(),
    durationSec: z.number().nonnegative(),
    clips: z.array(savedTimelineClipSchema).default([]),
  }),
);

export const savedTimelineTrackSchema = z.object({
  id: z.string().min(1),
  clips: z.array(savedTimelineClipSchema),
});

export const savedTimelineSchema = z.object({
  durationSec: z.number().nonnegative(),
  tracks: z.array(savedTimelineTrackSchema),
});

export type SavedTimelineTrack = z.infer<typeof savedTimelineTrackSchema>;
export type SavedTimeline = z.infer<typeof savedTimelineSchema>;

export const EMPTY_TIMELINE: SavedTimeline = {
  durationSec: 0,
  tracks: [{ id: SEQUENCE_TRACK_ID, clips: [] }],
};
