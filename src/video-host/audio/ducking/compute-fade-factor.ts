import { ramp } from "./ramp";

export function computeFadeFactor(
  localFrame: number,
  durationFrames: number,
  fadeIn: boolean,
  fadeOut: boolean,
  fadeFrames: number,
): number {
  let factor = 1;

  if (fadeIn && localFrame < fadeFrames) {
    factor *= ramp(localFrame, [0, fadeFrames], [0, 1]);
  }

  if (fadeOut && localFrame > durationFrames - fadeFrames) {
    factor *= ramp(localFrame, [durationFrames - fadeFrames, durationFrames], [1, 0]);
  }

  return factor;
}
