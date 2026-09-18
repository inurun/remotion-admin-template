import { describe, expect, it } from "vitest";
import {
  getPlayingPageId,
  getProjectPageTimings,
  getPageMoveState,
  resolvePageListItemPresentation,
} from "@/app/components/app-editor/editor-card/page-list/page-list.lib";

describe("page list", () => {
  it("builds page timings from the saved timeline", () => {
    expect(
      getProjectPageTimings({
        durationSec: 4.75,
        tracks: [
          {
            id: "sequence",
            clips: [
              { id: "page-1", startSec: 0, durationSec: 1.75, clips: [] },
              { id: "page-2", startSec: 1.75, durationSec: 3, clips: [] },
            ],
          },
        ],
      }),
    ).toEqual([
      { id: "page-1", startSec: 0, endSec: 1.75 },
      { id: "page-2", startSec: 1.75, endSec: 4.75 },
    ]);
  });

  it("resolves the playing page from the current frame", () => {
    const pages = [
      { id: "page-1", startSec: 0, endSec: 1.75 },
      { id: "page-2", startSec: 1.75, endSec: 4.75 },
    ];

    expect(getPlayingPageId(pages, 0, 24)).toBe("page-1");
    expect(getPlayingPageId(pages, Math.round(1.75 * 24) - 1, 24)).toBe("page-1");
    expect(getPlayingPageId(pages, Math.round(1.75 * 24), 24)).toBe("page-2");
    expect(getPlayingPageId([], 0, 24)).toBeNull();
  });

  it("picks the last overlapping clip at a transition cut", () => {
    const pages = [
      { id: "page-1", startSec: 0, endSec: 5 },
      { id: "tr-1", startSec: 4.2, endSec: 5 },
      { id: "page-2", startSec: 4.2, endSec: 7.2 },
    ];

    expect(getPlayingPageId(pages, Math.round(4.1 * 24), 24)).toBe("page-1");
    expect(getPlayingPageId(pages, Math.round(4.2 * 24), 24)).toBe("page-2");
    expect(getPlayingPageId(pages, Math.round(7.2 * 24), 24)).toBe("page-2");
  });

  it("accounts for transition overlap in sequence timings", () => {
    expect(
      getProjectPageTimings({
        durationSec: 7.2,
        tracks: [
          {
            id: "sequence",
            clips: [
              { id: "page-1", startSec: 0, durationSec: 5, clips: [] },
              { id: "tr-1", startSec: 4.2, durationSec: 0.8, clips: [] },
              { id: "page-2", startSec: 4.2, durationSec: 3, clips: [] },
            ],
          },
        ],
      }),
    ).toEqual([
      { id: "page-1", startSec: 0, endSec: 5 },
      { id: "tr-1", startSec: 4.2, endSec: 5 },
      { id: "page-2", startSec: 4.2, endSec: 7.2 },
    ]);
  });

  it("keeps the selected page selected after moving pages", () => {
    const pageIds = ["a", "b", "c", "d"];

    expect(getPageMoveState(pageIds, 2, 0, 3)?.nextSelectedPageIndex).toBe(1);
    expect(getPageMoveState(pageIds, 1, 1, 3)?.nextSelectedPageIndex).toBe(3);
    expect(getPageMoveState(pageIds, null, 1, 3)?.nextSelectedPageIndex).toBeNull();
  });

  it("resolves valid page moves", () => {
    expect(getPageMoveState(["a", "b", "c"], 1, 0, 2)).toEqual({
      fromIndex: 0,
      toIndex: 2,
      nextSelectedPageIndex: 0,
    });
  });

  it("rejects invalid page moves", () => {
    expect(getPageMoveState(["a", "b"], 0, 0, 0)).toBeNull();
    expect(getPageMoveState(["a", "b"], 0, -1, 1)).toBeNull();
    expect(getPageMoveState(["a", "b"], 0, 0, 2)).toBeNull();
  });

  it("presents transitions without a thumbnail title", () => {
    expect(resolvePageListItemPresentation({ type: "transition", variant: "slide" })).toEqual({
      kind: "transition",
      variant: "slide",
    });
  });

  it("presents page titles only when they are non-empty", () => {
    expect(resolvePageListItemPresentation(undefined)).toBeNull();
    expect(
      resolvePageListItemPresentation({ type: "main", title: "  Opening  ", tts: [{}, {}] }),
    ).toEqual({
      kind: "page",
      pageType: "main",
      title: "Opening",
      ttsCount: 2,
    });
    expect(resolvePageListItemPresentation({ type: "intro", title: "   ", tts: [] })).toEqual({
      kind: "page",
      pageType: "intro",
      title: null,
      ttsCount: 0,
    });
  });
});
