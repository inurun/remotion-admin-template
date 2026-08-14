import { interpolate } from "remotion";
import type { DuckableInterval } from "./collect-duckable-intervals";

const DUCK_VOLUME = 0.2;

/**
 * @param holdFrames - TTS 終了後に 20% を維持するフレーム数
 * @param fadeDownFrames - 100% → 20% に落とすフレーム数
 * @param fadeUpFrames - 20% → 100% に戻すフレーム数
 */
export function computeDuckFactor(
  frame: number,
  intervals: DuckableInterval[],
  holdFrames: number,
  fadeDownFrames: number,
  fadeUpFrames: number,
): number {
  let minFactor = 1;

  for (const interval of intervals) {
    const releaseFrame = interval.to + holdFrames;

    if (frame < interval.from) {
      continue;
    }

    // fade-down: 1.0 → DUCK_VOLUME
    if (frame < interval.from + fadeDownFrames) {
      const factor = interpolate(
        frame,
        [interval.from, interval.from + fadeDownFrames],
        [1, DUCK_VOLUME],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
      minFactor = Math.min(minFactor, factor);
      continue;
    }

    // sustained + hold: DUCK_VOLUME を維持
    if (frame < releaseFrame) {
      minFactor = Math.min(minFactor, DUCK_VOLUME);
      continue;
    }

    // fade-up: DUCK_VOLUME → 1.0
    if (frame < releaseFrame + fadeUpFrames) {
      const factor = interpolate(
        frame,
        [releaseFrame, releaseFrame + fadeUpFrames],
        [DUCK_VOLUME, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
      minFactor = Math.min(minFactor, factor);
    }
  }

  return minFactor;
}
