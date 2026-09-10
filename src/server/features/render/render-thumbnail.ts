import { VIDEO_FPS } from "@/constants";
import { msToFrame } from "@/remotion/utils/timing/frame-utils";

const THUMBNAIL_TIME_PATTERN = /^(\d{2}):([0-5]\d)\.(\d{3})$/;

export function thumbnailTimeToFrame(thumbnailTime: string): number {
  const match = thumbnailTime.match(THUMBNAIL_TIME_PATTERN);
  if (!match) {
    throw new Error("Thumbnail time must be MM:SS.mmm");
  }

  const [, minutes, seconds, milliseconds] = match;
  const timeMs = Number(minutes) * 60_000 + Number(seconds) * 1_000 + Number(milliseconds);
  return msToFrame(timeMs, VIDEO_FPS);
}
