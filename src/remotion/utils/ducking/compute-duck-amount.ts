import { interpolate } from "remotion";
import type { DuckableInterval } from "./collect-duckable-intervals";

/**
 * @param holdFrames - TTS 終了後に drop を維持するフレーム数
 * @param fadeDownFrames - 0 → drop に上げるフレーム数
 * @param fadeUpFrames - drop → 0 に戻すフレーム数
 * @param drop - TTS 中に track.volume から引く量
 */
export function computeDuckAmount(
  frame: number,
  intervals: DuckableInterval[],
  holdFrames: number,
  fadeDownFrames: number,
  fadeUpFrames: number,
  drop: number,
): number {
  let maxAmount = 0;

  for (const interval of intervals) {
    const releaseFrame = interval.to + holdFrames;

    if (frame < interval.from) {
      continue;
    }

    // fade-down: 0 → drop
    if (frame < interval.from + fadeDownFrames) {
      const amount = interpolate(
        frame,
        [interval.from, interval.from + fadeDownFrames],
        [0, drop],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
      maxAmount = Math.max(maxAmount, amount);
      continue;
    }

    // sustained + hold: drop を維持
    if (frame < releaseFrame) {
      maxAmount = Math.max(maxAmount, drop);
      continue;
    }

    // fade-up: drop → 0
    if (frame < releaseFrame + fadeUpFrames) {
      const amount = interpolate(frame, [releaseFrame, releaseFrame + fadeUpFrames], [drop, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      maxAmount = Math.max(maxAmount, amount);
    }
  }

  return maxAmount;
}
