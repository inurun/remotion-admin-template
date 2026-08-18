import { describe, expect, it } from "vitest";
import { useRenderProgress } from "./use-render-progress";

describe("useRenderProgress", () => {
  it("clamps and rounds progress for the bar", () => {
    expect(useRenderProgress(-4).value).toBe(0);
    expect(useRenderProgress(41.6).value).toBe(42);
    expect(useRenderProgress(140).value).toBe(100);
  });
});
