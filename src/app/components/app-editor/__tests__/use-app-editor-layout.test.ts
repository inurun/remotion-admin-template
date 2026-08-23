import { describe, expect, it } from "vitest";
import {
  getConfigPaneClassName,
  getPreviewConfigColumnClassName,
} from "@/app/components/app-editor/app-editor.lib";
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

  it("fills the preview config column and scrolls open config", () => {
    expect(getPreviewConfigColumnClassName(true)).toContain("h-full");
    expect(getPreviewConfigColumnClassName(true)).toContain("overflow-hidden");
    expect(getPreviewConfigColumnClassName(false)).not.toContain("h-full");
    expect(getConfigPaneClassName(true, true)).toContain("overflow-y-auto");
    expect(getConfigPaneClassName(true, false)).toContain("shrink-0");
    expect(getConfigPaneClassName(false, true)).not.toContain("overflow-y-auto");
  });
});
