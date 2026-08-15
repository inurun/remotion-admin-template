import { describe, expect, it } from "vitest";
import type { SavedProject } from "@/_schemas";
import { collectDuckableIntervals as collectTtsIntervals } from "../collect-duckable-intervals";

const FPS = 30;

function tts(durationSec: number) {
  return {
    id: "t",
    provider: "voisona" as const,
    text: "",
    durationSec,
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    audio: { src: "" },
    speech: {},
  };
}

function withTtsTiming(
  item: ReturnType<typeof tts>,
  timing: Partial<Pick<ReturnType<typeof tts>, "padBeforeSec" | "padAfterSec">>,
) {
  return { ...item, ...timing };
}

function page(opts: {
  durationSec: number;
  padBeforeSec?: number;
  padAfterSec?: number;
  tts?: ReturnType<typeof tts>[];
}): SavedProject["pages"][number] {
  return {
    id: "p",
    title: "",
    type: "main",
    meta: { tags: [] },
    richText: null,
    padBeforeSec: opts.padBeforeSec ?? 0,
    padAfterSec: opts.padAfterSec ?? 0,
    durationSec: opts.durationSec,
    tts: opts.tts ?? [],
  };
}

function project(pages: SavedProject["pages"]): SavedProject {
  return {
    meta: {
      title: "",
      description: "",
      width: 1920,
      height: 1080,
      weather: {},
      niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
    },
    bgm: [],
    pages,
    voicePresets: [],
  };
}

describe("collectTtsIntervals", () => {
  it("returns empty array for a project with no pages", () => {
    expect(collectTtsIntervals(project([]), FPS)).toEqual([]);
  });

  it("returns empty array when pages have no tts", () => {
    expect(collectTtsIntervals(project([page({ durationSec: 3 })]), FPS)).toEqual([]);
  });

  it("keeps zero duration tts as one frame", () => {
    const p = page({ durationSec: 3, tts: [tts(0)] });
    expect(collectTtsIntervals(project([p]), FPS)).toEqual([{ from: 0, to: 1 }]);
  });

  it("returns a single interval for one tts on one page", () => {
    // padBeforeSec=0, tts=1s → frames 0-30
    const p = page({ durationSec: 1, tts: [tts(1)] });
    expect(collectTtsIntervals(project([p]), FPS)).toEqual([{ from: 0, to: 30 }]);
  });

  it("offsets tts start by padBeforeSec", () => {
    // padBeforeSec=1s (30f), tts=1s → frames 30-60
    const p = page({ durationSec: 2, padBeforeSec: 1, tts: [tts(1)] });
    expect(collectTtsIntervals(project([p]), FPS)).toEqual([{ from: 30, to: 60 }]);
  });

  it("places multiple tts sequentially within a page", () => {
    // tts1=1s(0-30), tts2=2s(30-90)
    const p = page({ durationSec: 3, tts: [tts(1), tts(2)] });
    expect(collectTtsIntervals(project([p]), FPS)).toEqual([
      { from: 0, to: 30 },
      { from: 30, to: 90 },
    ]);
  });

  it("applies tts pads and allows overlap", () => {
    const p = page({
      durationSec: 3,
      tts: [
        withTtsTiming(tts(1), { padBeforeSec: 0.5, padAfterSec: -0.2 }),
        withTtsTiming(tts(1), { padBeforeSec: -0.3, padAfterSec: 0 }),
      ],
    });

    expect(collectTtsIntervals(project([p]), FPS)).toEqual([
      { from: 15, to: 39 },
      { from: 30, to: 60 },
    ]);
  });

  it("offsets intervals on subsequent pages by the prior page duration", () => {
    // page1: durationSec=3 (90f), tts=1s → frames 0-30
    // page2: starts at frame 90, tts=1s → frames 90-120
    const pages = [
      page({ durationSec: 3, tts: [tts(1)] }),
      page({ durationSec: 3, tts: [tts(1)] }),
    ];
    expect(collectTtsIntervals(project(pages), FPS)).toEqual([
      { from: 0, to: 30 },
      { from: 90, to: 120 },
    ]);
  });

  it("applies padBeforeSec relative to the page's global start frame", () => {
    // page1: durationSec=3(90f), no tts
    // page2: starts at 90f, padBeforeSec=1s(30f), tts=1s → frames 120-150
    const pages = [
      page({ durationSec: 3 }),
      page({ durationSec: 4, padBeforeSec: 1, tts: [tts(1)] }),
    ];
    expect(collectTtsIntervals(project(pages), FPS)).toEqual([{ from: 120, to: 150 }]);
  });

  it("uses Math.max(1, durationSec*fps) for page offset when page durationSec is 0", () => {
    // page1: durationSec=0 → clamped to 1 frame
    // page2: starts at frame 1
    const pages = [page({ durationSec: 0 }), page({ durationSec: 2, tts: [tts(1)] })];
    const intervals = collectTtsIntervals(project(pages), FPS);
    expect(intervals[0]?.from).toBe(1);
  });

  it("shortens subsequent page offsets by transition overlap duration", () => {
    // page1: 3s (90f), tts 1s → 0-30
    // transition slide: 0.8s (24f) overlap
    // page2: starts at 90-24=66f, tts 1s → 66-96
    const pages: SavedProject["pages"] = [
      page({ durationSec: 3, tts: [tts(1)] }),
      {
        id: "tr",
        type: "transition",
        variant: "slide",
      },
      page({ durationSec: 3, tts: [tts(1)] }),
    ];
    expect(collectTtsIntervals(project(pages), FPS)).toEqual([
      { from: 0, to: 30 },
      { from: 66, to: 96 },
    ]);
  });
});
