import { describe, expect, it } from "vitest";
import {
  clampSidebarWidth,
  isSidebarResizeDrag,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  nextSidebarWidth,
} from "@/_shared/lib/sidebar-width";

describe("sidebar width", () => {
  it("clamps sidebar width to the allowed range", () => {
    expect(clampSidebarWidth(0)).toBe(MIN_SIDEBAR_WIDTH);
    expect(clampSidebarWidth(9999)).toBe(MAX_SIDEBAR_WIDTH);
    expect(clampSidebarWidth(300.8)).toBe(301);
  });

  it("computes the next width from a pointer drag", () => {
    expect(nextSidebarWidth(256, 100, 140)).toBe(296);
    expect(isSidebarResizeDrag(100, 102)).toBe(false);
    expect(isSidebarResizeDrag(100, 104)).toBe(true);
  });
});
