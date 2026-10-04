import { describe, expect, it } from "vitest";
import { computeFadeFactor } from "../compute-fade-factor";

const FADE = 15; // 1.5s at 10fps (easy round numbers)
const DURATION = 90;

describe("computeFadeFactor", () => {
  describe("no fade", () => {
    it("returns 1 throughout when both fades are disabled", () => {
      expect(computeFadeFactor(0, DURATION, false, false, FADE)).toBe(1);
      expect(computeFadeFactor(45, DURATION, false, false, FADE)).toBe(1);
      expect(computeFadeFactor(DURATION, DURATION, false, false, FADE)).toBe(1);
    });
  });

  describe("fade-in only", () => {
    it("returns 0 at frame 0", () => {
      expect(computeFadeFactor(0, DURATION, true, false, FADE)).toBe(0);
    });

    it("returns a value between 0 and 1 during fade-in", () => {
      const v = computeFadeFactor(Math.floor(FADE / 2), DURATION, true, false, FADE);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    });

    it("returns 1 once fade-in completes", () => {
      expect(computeFadeFactor(FADE, DURATION, true, false, FADE)).toBeCloseTo(1);
      expect(computeFadeFactor(60, DURATION, true, false, FADE)).toBe(1);
    });
  });

  describe("fade-out only", () => {
    it("returns 1 well before fade-out starts", () => {
      expect(computeFadeFactor(0, DURATION, false, true, FADE)).toBe(1);
      expect(computeFadeFactor(DURATION - FADE - 1, DURATION, false, true, FADE)).toBe(1);
    });

    it("returns a value between 0 and 1 during fade-out", () => {
      const v = computeFadeFactor(DURATION - Math.floor(FADE / 2), DURATION, false, true, FADE);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    });

    it("returns 0 at the last frame", () => {
      expect(computeFadeFactor(DURATION, DURATION, false, true, FADE)).toBeCloseTo(0);
    });
  });

  describe("fade-in and fade-out", () => {
    it("returns 0 at frame 0", () => {
      expect(computeFadeFactor(0, DURATION, true, true, FADE)).toBe(0);
    });

    it("returns 1 in the middle", () => {
      expect(computeFadeFactor(45, DURATION, true, true, FADE)).toBe(1);
    });

    it("returns 0 at the last frame", () => {
      expect(computeFadeFactor(DURATION, DURATION, true, true, FADE)).toBeCloseTo(0);
    });

    it("combines both fades multiplicatively when they overlap", () => {
      const shortDuration = 10;
      const shortFade = 8;
      // At frame 5: fadeIn factor * fadeOut factor
      const v = computeFadeFactor(5, shortDuration, true, true, shortFade);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    });
  });
});
