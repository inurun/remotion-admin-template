import { describe, expect, it } from "vitest";
import { formatFrameTime, getPreviewPageStartFrame } from "../preview-card.lib";

describe("preview card", () => {
  it("resolves a page start second to a frame", () => {
    expect(getPreviewPageStartFrame(1.5, 24, 120)).toBe(36);
  });

  it("keeps page start frames inside the project range", () => {
    expect(getPreviewPageStartFrame(10, 24, 120)).toBe(119);
  });

  it("uses the beginning when the page timing is missing", () => {
    expect(getPreviewPageStartFrame(undefined, 24, 120)).toBe(0);
  });

  it("formats frame positions as thumbnail time labels", () => {
    expect(formatFrameTime(0, 30)).toBe("00:00.000");
    expect(formatFrameTime(1, 30)).toBe("00:00.033");
    expect(formatFrameTime(15, 30)).toBe("00:00.500");
    expect(formatFrameTime(24 * 65, 24)).toBe("01:05.000");
  });
});
