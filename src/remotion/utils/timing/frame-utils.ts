import { VIDEO_FPS } from "@/constants";

export function secondsToFrames(seconds: number, fps: number = VIDEO_FPS): number {
  return Math.round(seconds * fps);
}

export function framesToSeconds(frames: number, fps: number = VIDEO_FPS): number {
  return frames / fps;
}

export function msToFrame(timeMs: number, fps: number = VIDEO_FPS): number {
  return Math.round((timeMs / 1000) * fps);
}

export function frameToMs(frame: number, fps: number = VIDEO_FPS): number {
  return (frame / fps) * 1000;
}

export function clampFrame(frame: number, min: number = 0, max: number): number {
  return Math.max(min, Math.min(max, frame));
}

export function getProgress(frame: number, start: number, end: number): number {
  if (frame <= start) {
    return 0;
  }

  if (frame >= end) {
    return 1;
  }

  return (frame - start) / (end - start);
}
