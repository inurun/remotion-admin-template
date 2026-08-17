import { describe, expect, it } from "vitest";
import { formatFrameTime, getPageIdToSeek, getPreviewPageStartFrame } from "../preview-card.lib";

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

  it("seeks when the selected page changes, including the first selection", () => {
    expect(getPageIdToSeek(null, "page-1")).toBe("page-1");
    expect(getPageIdToSeek("page-1", "page-2")).toBe("page-2");
  });

  it("does not seek when the selected page stays the same or is cleared", () => {
    expect(getPageIdToSeek("page-1", "page-1")).toBeNull();
    expect(getPageIdToSeek("page-1", null)).toBeNull();
    expect(getPageIdToSeek(null, null)).toBeNull();
  });
});
