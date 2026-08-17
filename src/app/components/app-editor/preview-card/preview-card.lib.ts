export type PreviewPlaybackRate = 1 | 1.5 | 2;

export const PREVIEW_PLAYBACK_RATES: PreviewPlaybackRate[] = [1, 1.5, 2];
export const DEFAULT_PREVIEW_PLAYBACK_RATE: PreviewPlaybackRate = 1;

export function clampFrame(frame: number, durationInFrames: number) {
  return Math.min(Math.max(frame, 0), Math.max(0, durationInFrames - 1));
}

export function getPreviewPageStartFrame(
  startSec: number | undefined,
  fps: number,
  durationInFrames: number,
) {
  return clampFrame(Math.round((startSec ?? 0) * fps), durationInFrames);
}

export function formatFrameTime(frame: number, fps: number) {
  const totalMs = Math.max(0, Math.round((frame / fps) * 1000));
  const minutes = Math.floor(totalMs / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const milliseconds = totalMs % 1000;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}
