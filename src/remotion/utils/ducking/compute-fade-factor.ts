import { interpolate } from "remotion";

export function computeFadeFactor(
  localFrame: number,
  durationFrames: number,
  fadeIn: boolean,
  fadeOut: boolean,
  fadeFrames: number,
): number {
  let factor = 1;

  if (fadeIn && localFrame < fadeFrames) {
    factor *= interpolate(localFrame, [0, fadeFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  if (fadeOut && localFrame > durationFrames - fadeFrames) {
    factor *= interpolate(localFrame, [durationFrames - fadeFrames, durationFrames], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  return factor;
}
