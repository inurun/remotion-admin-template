import { describe, expect, it } from "vitest";
import { computeDuckAmount } from "../compute-duck-amount";

const DROP = 0.2;

const FADE_DOWN = 15; // 0.5s at 30fps
const HOLD = 15; // 0.5s at 30fps
const FADE_UP = 30; // 1.0s at 30fps

function duck(frame: number, intervals: { from: number; to: number }[]) {
  return computeDuckAmount(frame, intervals, HOLD, FADE_DOWN, FADE_UP, DROP);
}

describe("computeDuckAmount", () => {
  describe("no intervals", () => {
    it("returns 0 when there are no intervals", () => {
      expect(duck(0, [])).toBe(0);
      expect(duck(100, [])).toBe(0);
    });
  });

  describe("frame before interval", () => {
    it("returns 0 before an interval starts", () => {
      expect(duck(0, [{ from: 30, to: 90 }])).toBe(0);
      expect(duck(29, [{ from: 30, to: 90 }])).toBe(0);
    });
  });

  describe("fade-down phase (interval.from → interval.from + fadeDownFrames)", () => {
    it("returns 0 at the exact start of an interval", () => {
      expect(duck(30, [{ from: 30, to: 90 }])).toBe(0);
    });

    it("returns a value between 0 and DROP during fade-down", () => {
      const mid = 30 + Math.floor(FADE_DOWN / 2);
      const amount = duck(mid, [{ from: 30, to: 90 }]);
      expect(amount).toBeGreaterThan(0);
      expect(amount).toBeLessThan(DROP);
    });

    it("returns DROP at the end of fade-down", () => {
      expect(duck(30 + FADE_DOWN, [{ from: 30, to: 90 }])).toBeCloseTo(DROP);
    });
  });

  describe("sustained phase (interval.from + fadeDownFrames → interval.to)", () => {
    it("returns DROP when fully inside the interval", () => {
      expect(duck(60, [{ from: 30, to: 90 }])).toBe(DROP);
    });
  });

  describe("hold phase (interval.to → interval.to + holdFrames)", () => {
    it("returns DROP immediately after the interval ends", () => {
      expect(duck(90, [{ from: 30, to: 90 }])).toBe(DROP);
    });

    it("maintains DROP throughout the hold period", () => {
      expect(duck(95, [{ from: 30, to: 90 }])).toBe(DROP);
      expect(duck(104, [{ from: 30, to: 90 }])).toBe(DROP);
    });
  });

  describe("fade-up phase (releaseFrame → releaseFrame + fadeUpFrames)", () => {
    // releaseFrame = interval.to + holdFrames = 90 + 15 = 105
    it("starts fading up after the hold period", () => {
      const amount = duck(105 + Math.floor(FADE_UP / 2), [{ from: 30, to: 90 }]);
      expect(amount).toBeGreaterThan(0);
      expect(amount).toBeLessThan(DROP);
    });

    it("returns 0 once fade-up completes", () => {
      // releaseFrame + fadeUpFrames = 105 + 30 = 135
      expect(duck(135, [{ from: 30, to: 90 }])).toBe(0);
      expect(duck(200, [{ from: 30, to: 90 }])).toBe(0);
    });
  });

  describe("stacking: next TTS starts during hold period", () => {
    it("stays at DROP without any gap to 0", () => {
      // interval1: 0-30, hold: 30-45
      // interval2 starts at 40 (inside interval1's hold)
      const intervals = [
        { from: 0, to: 30 },
        { from: 40, to: 70 },
      ];
      expect(duck(35, intervals)).toBe(DROP);
      expect(duck(42, intervals)).toBe(DROP);
      expect(duck(60, intervals)).toBe(DROP);
    });

    it("never reaches 0 when intervals are close together", () => {
      // interval1 ends at 30, releaseFrame=45, fade-up: 45-75
      // interval2 starts at 50 (during fade-up of interval1)
      const intervals = [
        { from: 0, to: 30 },
        { from: 50, to: 80 },
      ];
      for (let f = 0; f <= 120; f++) {
        expect(duck(f, intervals)).toBeGreaterThanOrEqual(0);
      }
      expect(duck(48, intervals)).toBeGreaterThan(0);
    });
  });

  describe("stacking: overlapping intervals", () => {
    it("stays ducked while any interval is active", () => {
      const intervals = [
        { from: 0, to: 60 },
        { from: 30, to: 90 },
      ];
      expect(duck(50, intervals)).toBe(DROP);
    });

    it("restores volume only after both intervals and their hold periods end", () => {
      // interval1: 0-30, hold ends 45, fade-up ends 75
      // interval2: 0-60, hold ends 75, fade-up ends 105
      const intervals = [
        { from: 0, to: 30 },
        { from: 0, to: 60 },
      ];
      expect(duck(50, intervals)).toBe(DROP);
      expect(duck(74, intervals)).toBe(DROP);
      expect(duck(75 + FADE_UP, intervals)).toBe(0);
    });
  });

  describe("multiple non-overlapping intervals", () => {
    it("ducks and holds independently for each interval", () => {
      const intervals = [
        { from: 0, to: 30 },
        { from: 200, to: 230 },
      ];
      expect(duck(0 + FADE_DOWN + 5, intervals)).toBe(DROP);
      expect(duck(30 + HOLD + FADE_UP, intervals)).toBe(0);
      expect(duck(215, intervals)).toBe(DROP);
    });
  });
});
