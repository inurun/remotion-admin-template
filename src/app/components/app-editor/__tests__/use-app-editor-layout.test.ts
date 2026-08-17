import { describe, expect, it } from "vitest";
import {
  getPreviewConfigColumnClassName,
  getPreviewConfigScrollClassName,
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

  it("keeps the preview config column sticky and viewport-capped", () => {
    expect(getPreviewConfigColumnClassName(true)).toContain("sticky");
    expect(getPreviewConfigColumnClassName(true)).toContain("max-h-[calc(100dvh-2rem)]");
    expect(getPreviewConfigColumnClassName(false)).not.toContain("sticky");
  });

  it("scrolls config inside the sticky column", () => {
    expect(getPreviewConfigScrollClassName(true)).toContain("overflow-y-auto");
    expect(getPreviewConfigScrollClassName(false)).not.toContain("overflow-y-auto");
  });
});
