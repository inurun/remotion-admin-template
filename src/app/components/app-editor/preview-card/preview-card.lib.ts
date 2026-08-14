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
  const totalSeconds = Math.max(0, Math.floor(frame / fps));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
