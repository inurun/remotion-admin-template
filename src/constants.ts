import { z } from "zod";

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
    import.meta.env.VITE_VIDEO_FPS ??
    processEnv["VITE_VIDEO_FPS"] ??
    processEnv["NEXT_PUBLIC_VIDEO_FPS"],
});

export const VIDEO_FPS = parsed.VITE_VIDEO_FPS;
export const COMP_NAME = "Video";
