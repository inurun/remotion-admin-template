import { describe, expect, it } from "vitest";
import { createTtsTimingSegments, getTtsTimingEndSec } from "../tts-timing";

describe("createTtsTimingSegments", () => {
  it("places tts by before/audio/after timing", () => {
    expect(
      createTtsTimingSegments([
        { durationSec: 1, padBeforeSec: 0.2, padAfterSec: 0.3 },
        { durationSec: 2, padBeforeSec: 0.5, padAfterSec: 0 },
      ]),
    ).toEqual([
      { startSec: 0.2, durationSec: 1.3, endSec: 1.5 },
      { startSec: 2, durationSec: 2, endSec: 4 },
    ]);
  });

  it("allows negative pads to overlap segments", () => {
    const segments = createTtsTimingSegments([
      { durationSec: 1, padBeforeSec: 0, padAfterSec: -0.4 },
      { durationSec: 1, padBeforeSec: -0.2, padAfterSec: 0 },
    ]);

    expect(segments[0]).toEqual({ startSec: 0, durationSec: 0.6, endSec: 0.6 });
    expect(segments[1]?.startSec).toBeCloseTo(0.4);
    expect(segments[1]?.durationSec).toBe(1);
    expect(segments[1]?.endSec).toBeCloseTo(1.4);
  });

  it("clamps duration with minDurationSec", () => {
    const segments = createTtsTimingSegments([{ durationSec: 0.1, padAfterSec: -1 }], {
      minDurationSec: 1 / 30,
    });

    expect(segments[0]?.durationSec).toBe(1 / 30);
    expect(getTtsTimingEndSec(segments)).toBe(1 / 30);
  });
});
