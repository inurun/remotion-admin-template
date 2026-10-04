import { VIDEO_FPS } from "@/constants";

export function secondsToFrames(seconds: number, fps: number = VIDEO_FPS): number {
  return Math.round(seconds * fps);
}

/** Convert a seconds range by rounding both ends so consecutive ranges abut. */
export function secondsRangeToFrames(
  startSec: number,
  durationSec: number,
  fps: number = VIDEO_FPS,
): { start: number; duration: number } {
  const start = secondsToFrames(startSec, fps);
  const end = secondsToFrames(startSec + durationSec, fps);
  return { start, duration: Math.max(1, end - start) };
}

export function msToFrame(timeMs: number, fps: number = VIDEO_FPS): number {
  return Math.round((timeMs / 1000) * fps);
}
