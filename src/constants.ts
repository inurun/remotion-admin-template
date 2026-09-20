import { z } from "zod";

export const AUTO_SAVE_DELAY = 60_000;

export const VIDEO_SIZE_PRESETS = [
  {
    id: "landscape",
    label: "Landscape",
    width: 1920,
    height: 1080,
  },
  {
    id: "square",
    label: "Square",
    width: 1280,
    height: 1280,
  },
  {
    id: "portrait",
    label: "Portrait",
    width: 1080,
    height: 1920,
  },
] as const;

const videoEnvSchema = z.object({
  VITE_VIDEO_FPS: z.coerce.number().int().positive().default(30),
});

const processEnv =
  typeof process !== "undefined" && process.env ? process.env : ({} as Record<string, string>);

const parsed = videoEnvSchema.parse({
  VITE_VIDEO_FPS:
    import.meta.env?.VITE_VIDEO_FPS ??
    processEnv["VITE_VIDEO_FPS"] ??
    processEnv["NEXT_PUBLIC_VIDEO_FPS"],
});

export const VIDEO_FPS = parsed.VITE_VIDEO_FPS;
export const COMP_NAME = "Video";

export const TRANSITION_DURATION_SEC = {
  slide: 0.8,
} as const;

export const ENDCARD_DURATION_SEC = 8;
export const EYECATCH_TEXT_MIN_DURATION_SEC = 0.5;
export const OUTRO_PAGE_DURATION_SEC = 5;
export const OUTRO_BLOCKS_PER_PAGE = 2;
export const OUTRO_CARDS_DELAY_SEC = 0.5;
export const OUTRO_PAPER_HOLD_AFTER_PAGE_SEC = -0.3;
export const OUTRO_PAPER_FADE_OUT_SEC = 0.25;
export const AUDIO_PADDING_SECONDS = 0.1;
export const MIN_TTS_DURATION_SECONDS = 1 / VIDEO_FPS;
