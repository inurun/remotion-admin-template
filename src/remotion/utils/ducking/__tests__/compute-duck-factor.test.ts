import { describe, expect, it } from "vitest";
import { computeDuckFactor } from "../compute-duck-factor";

const DUCK_VOLUME = 0.2;

const FADE_DOWN = 15; // 0.5s at 30fps
const HOLD = 15; // 0.5s at 30fps
const FADE_UP = 30; // 1.0s at 30fps

function duck(frame: number, intervals: { from: number; to: number }[]) {
  return computeDuckFactor(frame, intervals, HOLD, FADE_DOWN, FADE_UP);
}

describe("computeDuckFactor", () => {
  describe("no intervals", () => {
    it("returns 1 when there are no intervals", () => {
      expect(duck(0, [])).toBe(1);
      expect(duck(100, [])).toBe(1);
    });
  });

  describe("frame before interval", () => {
    it("returns 1 before an interval starts", () => {
      expect(duck(0, [{ from: 30, to: 90 }])).toBe(1);
      expect(duck(29, [{ from: 30, to: 90 }])).toBe(1);
    });
  });

  describe("fade-down phase (interval.from → interval.from + fadeDownFrames)", () => {
    it("returns 1 at the exact start of an interval", () => {
      expect(duck(30, [{ from: 30, to: 90 }])).toBe(1);
    });

    it("returns a value between 1 and DUCK_VOLUME during fade-down", () => {
      const mid = 30 + Math.floor(FADE_DOWN / 2);
      const factor = duck(mid, [{ from: 30, to: 90 }]);
      expect(factor).toBeGreaterThan(DUCK_VOLUME);
      expect(factor).toBeLessThan(1);
    });

    it("returns DUCK_VOLUME at the end of fade-down", () => {
      expect(duck(30 + FADE_DOWN, [{ from: 30, to: 90 }])).toBeCloseTo(DUCK_VOLUME);
    });
  });

  describe("sustained phase (interval.from + fadeDownFrames → interval.to)", () => {
    it("returns DUCK_VOLUME when fully inside the interval", () => {
      expect(duck(60, [{ from: 30, to: 90 }])).toBe(DUCK_VOLUME);
    });
  });

  describe("hold phase (interval.to → interval.to + holdFrames)", () => {
    it("returns DUCK_VOLUME immediately after the interval ends", () => {
      expect(duck(90, [{ from: 30, to: 90 }])).toBe(DUCK_VOLUME);
    });

    it("maintains DUCK_VOLUME throughout the hold period", () => {
      expect(duck(95, [{ from: 30, to: 90 }])).toBe(DUCK_VOLUME);
      expect(duck(104, [{ from: 30, to: 90 }])).toBe(DUCK_VOLUME);
    });
  });

  describe("fade-up phase (releaseFrame → releaseFrame + fadeUpFrames)", () => {
    // releaseFrame = interval.to + holdFrames = 90 + 15 = 105
    it("starts fading up after the hold period", () => {
      const factor = duck(105 + Math.floor(FADE_UP / 2), [{ from: 30, to: 90 }]);
      expect(factor).toBeGreaterThan(DUCK_VOLUME);
      expect(factor).toBeLessThan(1);
    });

    it("returns 1 once fade-up completes", () => {
      // releaseFrame + fadeUpFrames = 105 + 30 = 135
      expect(duck(135, [{ from: 30, to: 90 }])).toBe(1);
      expect(duck(200, [{ from: 30, to: 90 }])).toBe(1);
    });
  });

  describe("stacking: next TTS starts during hold period", () => {
    it("stays at DUCK_VOLUME without any gap to 1", () => {
      // interval1: 0-30, hold: 30-45
      // interval2 starts at 40 (inside interval1's hold)
      const intervals = [
        { from: 0, to: 30 },
        { from: 40, to: 70 },
      ];
      // At frame 35 (interval1 hold): interval1 → DUCK_VOLUME
      expect(duck(35, intervals)).toBe(DUCK_VOLUME);
      // At frame 42 (interval2 fade-down, interval1 still hold): min stays DUCK_VOLUME
      expect(duck(42, intervals)).toBe(DUCK_VOLUME);
      // At frame 60 (interval2 sustained): DUCK_VOLUME
      expect(duck(60, intervals)).toBe(DUCK_VOLUME);
    });

    it("never reaches 1 when intervals are close together", () => {
      // interval1 ends at 30, releaseFrame=45, fade-up: 45-75
      // interval2 starts at 50 (during fade-up of interval1)
      const intervals = [
        { from: 0, to: 30 },
        { from: 50, to: 80 },
      ];
      for (let f = 0; f <= 120; f++) {
        expect(duck(f, intervals)).toBeLessThanOrEqual(1);
      }
      // BGM never briefly touches 1.0 between the two intervals
      // At frame 48 (after hold, fade-up in progress): < 1
      expect(duck(48, intervals)).toBeLessThan(1);
    });
  });

  describe("stacking: overlapping intervals", () => {
    it("stays ducked while any interval is active", () => {
      const intervals = [
        { from: 0, to: 60 },
        { from: 30, to: 90 },
      ];
      expect(duck(50, intervals)).toBe(DUCK_VOLUME);
    });

    it("restores volume only after both intervals and their hold periods end", () => {
      // interval1: 0-30, hold ends 45, fade-up ends 75
      // interval2: 0-60, hold ends 75, fade-up ends 105
      const intervals = [
        { from: 0, to: 30 },
        { from: 0, to: 60 },
      ];
      expect(duck(50, intervals)).toBe(DUCK_VOLUME); // interval2 still sustained
      expect(duck(74, intervals)).toBe(DUCK_VOLUME); // interval2 still in hold
      // After releaseFrame of interval2 (=75), fade-up should start
      expect(duck(75 + FADE_UP, intervals)).toBe(1);
    });
  });

  describe("multiple non-overlapping intervals", () => {
    it("ducks and holds independently for each interval", () => {
      const intervals = [
        { from: 0, to: 30 },
        { from: 200, to: 230 },
      ];
      // Interval1 fully resolved
      expect(duck(0 + FADE_DOWN + 5, intervals)).toBe(DUCK_VOLUME); // sustained
      expect(duck(30 + HOLD + FADE_UP, intervals)).toBe(1); // fully restored
      // Interval2
      expect(duck(215, intervals)).toBe(DUCK_VOLUME); // interval2 sustained
    });
  });
});
