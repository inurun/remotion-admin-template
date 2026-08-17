import { describe, expect, it } from "vitest";
import {
  DESKTOP_EDITOR_LAYOUT_QUERY,
  getDesktopEditorLayout,
} from "@/app/components/app-editor/use-app-editor-layout";

describe("desktop editor layout", () => {
  it("falls back to a non-desktop layout when window is unavailable", () => {
    expect(getDesktopEditorLayout(undefined)).toBe(false);
  });

  it("reads the desktop media query when a window is provided", () => {
    expect(
      getDesktopEditorLayout({
        matchMedia: (query) => ({ matches: query === DESKTOP_EDITOR_LAYOUT_QUERY }),
      }),
    ).toBe(true);
    expect(
      getDesktopEditorLayout({
        matchMedia: () => ({ matches: false }),
      }),
    ).toBe(false);
  });
});
