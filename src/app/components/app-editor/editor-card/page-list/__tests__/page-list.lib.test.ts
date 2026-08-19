import { describe, expect, it } from "vitest";
import {
  getPageListStaggerDelayMs,
  getPageThumbnailFrame,
  getProjectPageTimings,
  getPageMoveState,
  PAGE_LIST_STAGGER_MAX_MS,
  PAGE_LIST_STAGGER_STEP_MS,
  resolvePageListItemPresentation,
} from "@/app/components/app-editor/editor-card/page-list/page-list.lib";

describe("page list", () => {
  it("uses a frame one second after the page starts", () => {
    expect(getPageThumbnailFrame({ startSec: 2, endSec: 5 }, 24, 120)).toBe(72);
  });

  it("keeps short-page thumbnails inside the page range", () => {
    expect(getPageThumbnailFrame({ startSec: 0, endSec: 0.5 }, 24, 120)).toBe(11);
  });

  it("keeps thumbnails inside the project range", () => {
    expect(getPageThumbnailFrame({ startSec: 4, endSec: 8 }, 24, 100)).toBe(99);
  });

  it("builds page timings from saved page durations", () => {
    expect(
      getProjectPageTimings({
        meta: {
          title: "project",
          description: "",
          width: 1920,
          height: 1080,
          weather: {},
          niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
        },
        bgm: [],
        voicePresets: [],
        pages: [
          {
            id: "page-1",
            title: "Intro",
            type: "intro",
            meta: { tags: [] },
            padBeforeSec: 0.5,
            padAfterSec: 0.25,
            durationSec: 1.75,
            richText: "<p>Intro</p>",
            tts: [],
          },
          {
            id: "page-2",
            title: "Main",
            type: "main",
            meta: { tags: [] },
            padBeforeSec: 0,
            padAfterSec: 0,
            durationSec: 3,
            richText: "<p>Main</p>",
            tts: [],
          },
        ],
      }),
    ).toEqual([
      { id: "page-1", startSec: 0, endSec: 1.75 },
      { id: "page-2", startSec: 1.75, endSec: 4.75 },
    ]);
  });

  it("accounts for transition overlap in sequence timings", () => {
    expect(
      getProjectPageTimings({
        meta: {
          title: "project",
          description: "",
          width: 1920,
          height: 1080,
          weather: {},
          niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
        },
        bgm: [],
        voicePresets: [],
        pages: [
          {
            id: "page-1",
            title: "A",
            type: "main",
            meta: { tags: [] },
            padBeforeSec: 0,
            padAfterSec: 0,
            durationSec: 5,
            richText: null,
            tts: [],
          },
          {
            id: "tr-1",
            type: "transition",
            variant: "slide",
          },
          {
            id: "page-2",
            title: "B",
            type: "main",
            meta: { tags: [] },
            padBeforeSec: 0,
            padAfterSec: 0,
            durationSec: 3,
            richText: null,
            tts: [],
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

  it("staggers page list items by 100ms and caps the delay", () => {
    expect(getPageListStaggerDelayMs(0)).toBe(0);
    expect(getPageListStaggerDelayMs(3)).toBe(3 * PAGE_LIST_STAGGER_STEP_MS);
    expect(getPageListStaggerDelayMs(10)).toBe(PAGE_LIST_STAGGER_MAX_MS);
    expect(getPageListStaggerDelayMs(-1)).toBe(0);
  });

  it("presents transitions without a thumbnail title", () => {
    expect(resolvePageListItemPresentation({ type: "transition", variant: "slide" })).toEqual({
      kind: "transition",
      variant: "slide",
    });
  });

  it("presents page titles only when they are non-empty", () => {
    expect(resolvePageListItemPresentation(undefined)).toBeNull();
    expect(resolvePageListItemPresentation({ type: "main", title: "  Opening  " })).toEqual({
      kind: "page",
      pageType: "main",
      title: "Opening",
    });
    expect(resolvePageListItemPresentation({ type: "intro", title: "   " })).toEqual({
      kind: "page",
      pageType: "intro",
      title: null,
    });
  });
});
