import { describe, expect, it } from "vitest";
import { normalizeHexColor } from "../color-picker.lib";

describe("normalizeHexColor", () => {
  it("accepts 6-digit hex with or without hash", () => {
    expect(normalizeHexColor("#3B82F6")).toBe("#3b82f6");
    expect(normalizeHexColor("3b82f6")).toBe("#3b82f6");
  });

  it("rejects invalid values", () => {
    expect(normalizeHexColor("#fff")).toBeNull();
    expect(normalizeHexColor("blue")).toBeNull();
    expect(normalizeHexColor("")).toBeNull();
  });
});
