import { describe, expect, it } from "vitest";
import {
  getLandingPageTtsCount,
  resolvePageIndexFromFieldCount,
  resolveSelectedPageIndexAfterRemove,
} from "@/app/features/page/lib/page-selection";
import type { DraftSequenceItem } from "@/_schemas";

function contentPage(tts: string[]): DraftSequenceItem {
  return {
    id: "p",
    title: "",
    type: "main",
    padBeforeSec: 0,
    padAfterSec: 0,
    richText: null,
    tts: tts.map((text, index) => ({
      id: `t${index}`,
      provider: "voisona" as const,
      text,
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
    })),
    meta: { tags: [] },
  };
}

function transitionItem(): DraftSequenceItem {
  return {
    id: "tr",
    type: "transition",
    variant: "slide",
  };
}

describe("page selection", () => {
  it("keeps the selected page in range after field count changes", () => {
    expect(resolvePageIndexFromFieldCount(null, 3)).toBe(0);
    expect(resolvePageIndexFromFieldCount(1, 3)).toBe(1);
    expect(resolvePageIndexFromFieldCount(4, 3)).toBe(2);
    expect(resolvePageIndexFromFieldCount(0, 0)).toBeNull();
  });

  it("resolves the selected page after removing a page", () => {
    expect(resolveSelectedPageIndexAfterRemove(null, 0, 2)).toBeNull();
    expect(resolveSelectedPageIndexAfterRemove(2, 0, 2)).toBe(1);
    expect(resolveSelectedPageIndexAfterRemove(0, 0, 0)).toBeNull();
    expect(resolveSelectedPageIndexAfterRemove(1, 1, 2)).toBe(1);
  });

  it("reads the landing page TTS count from the pre-removal page list", () => {
    const pageFields = [contentPage(["a"]), contentPage(["b", "c"]), contentPage([])];

    expect(getLandingPageTtsCount(pageFields, 1, null)).toBe(0);
    expect(getLandingPageTtsCount(pageFields, 1, 0)).toBe(1);
    expect(getLandingPageTtsCount(pageFields, 1, 1)).toBe(0);
  });

  it("returns 0 TTS count when landing on a transition", () => {
    const pageFields = [contentPage(["a"]), transitionItem(), contentPage(["b"])];
    expect(getLandingPageTtsCount(pageFields, 2, 1)).toBe(0);
  });
});
