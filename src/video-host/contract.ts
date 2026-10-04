// Preview data contract: embedded as `#hf-data` and sent over `HF_DATA_CHANNEL`.
// Also the shape of the composition definition `src/video` exports.
import { z } from "zod";
import type { HfNode } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import {
  savedProjectSchema,
  savedSchedulesSchema,
  savedTimelineSchema,
  type PageType,
} from "@/_schemas";
import type { HfMode } from "./constants";

export const hfDataSchema = z.object({
  project: savedProjectSchema,
  timeline: savedTimelineSchema,
  schedules: savedSchedulesSchema,
});

/** The composition's props. */
export type HfData = z.infer<typeof hfDataSchema>;

/** What the audio manifest reads from the composition: data only, safe to import on the server. */
export type VideoAudioConfig = {
  /** Page types whose ready TTS is heard. */
  ttsPageTypes: readonly PageType[];
  bgm: {
    fadeSec: number;
    /** `drop` is subtracted from the track volume while TTS plays. */
    duck: { drop: number; downSec: number; holdSec: number; releaseSec: number };
  };
};

export type VideoDefinition = VideoAudioConfig & {
  Composition: (props: HfData) => HfNode;
  /** Called once with the root `data-mode` before the first mount. */
  onMode?: (mode: HfMode) => void;
};
