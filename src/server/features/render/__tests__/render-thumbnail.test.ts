import { describe, expect, it } from "vitest";
import { thumbnailTimeToFrame } from "../render-thumbnail";

describe("thumbnailTimeToFrame", () => {
  it("converts the saved thumbnail time to the matching frame", () => {
    expect(thumbnailTimeToFrame("00:00.000")).toBe(0);
    expect(thumbnailTimeToFrame("00:00.033")).toBe(1);
    expect(thumbnailTimeToFrame("01:05.500")).toBe(1965);
  });

  it("rejects malformed times", () => {
    expect(() => thumbnailTimeToFrame("1:05")).toThrow("MM:SS.mmm");
  });
});
