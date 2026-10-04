import { describe, expect, it } from "vitest";
import { EMPTY_TIMELINE } from "@/_schemas";
import { getHfPreviewHref, getTimelineDurationInFrames } from "../constants";

describe("getTimelineDurationInFrames", () => {
  it("rounds up to whole frames with a 1-frame minimum", () => {
    expect(getTimelineDurationInFrames({ ...EMPTY_TIMELINE, durationSec: 10.01 }, 30)).toBe(301);
    expect(getTimelineDurationInFrames(EMPTY_TIMELINE, 30)).toBe(1);
  });
});

describe("getHfPreviewHref", () => {
  it("encodes path segments and puts reload-only stage values in the query", () => {
    expect(
      getHfPreviewHref("2026/10 oct", { durationInFrames: 300, width: 1920, height: 1080 }),
    ).toBe("/hf-preview/2026/10%20oct?d=300&w=1920&h=1080");
  });
});
