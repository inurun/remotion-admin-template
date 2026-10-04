import { describe, expect, it } from "vitest";
import { secondsRangeToFrames, secondsToFrames } from "../frame-utils";

describe("secondsRangeToFrames", () => {
  it("abuts consecutive ranges that independent start/duration rounding would gap", () => {
    const first = secondsRangeToFrames(0.74, 1.316, 30);
    const secondStartSec = 0.74 + 1.316;
    const second = secondsRangeToFrames(secondStartSec, 0.804, 30);

    expect(first).toEqual({ start: 22, duration: 40 });
    expect(first.start + first.duration).toBe(second.start);
    expect(secondsToFrames(0.74, 30) + secondsToFrames(1.316, 30)).toBe(61);
    expect(first.start + first.duration).toBe(62);
  });

  it("abuts a boundary that independent rounding would shift", () => {
    const startSec = 4.681333333333333;
    const durationSec = 0.516;
    const range = secondsRangeToFrames(startSec, durationSec, 30);

    expect(range).toEqual({ start: 140, duration: 16 });
    expect(range.start + range.duration).toBe(secondsToFrames(startSec + durationSec, 30));
  });

  it("abuts consecutive TTS that independent start/duration rounding gapped at 24.1s", () => {
    const first = secondsRangeToFrames(2.1066666666666665, 0.612, 30);
    const second = secondsRangeToFrames(2.7186666666666666, 0.6759999999999999, 30);

    expect(first.start + first.duration).toBe(second.start);
    expect(secondsToFrames(2.1066666666666665, 30) + secondsToFrames(0.612, 30)).toBe(81);
    expect(secondsToFrames(2.7186666666666666, 30)).toBe(82);
  });
});
