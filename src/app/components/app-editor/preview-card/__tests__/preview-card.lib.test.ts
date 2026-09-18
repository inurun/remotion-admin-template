import { describe, expect, it } from "vitest";
import { formatFrameTime } from "../preview-card.lib";

describe("preview card", () => {
  it("formats frame positions as thumbnail time labels", () => {
    expect(formatFrameTime(0, 30)).toBe("00:00.000");
    expect(formatFrameTime(1, 30)).toBe("00:00.033");
    expect(formatFrameTime(15, 30)).toBe("00:00.500");
    expect(formatFrameTime(24 * 65, 24)).toBe("01:05.000");
  });
});
