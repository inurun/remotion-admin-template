import { describe, expect, it } from "vitest";
import { isOtherDimensionAvatar } from "../other-dimension";

describe("isOtherDimensionAvatar", () => {
  it("returns false for the demo avatar", () => {
    expect(isOtherDimensionAvatar("demo")).toBe(false);
  });
});
