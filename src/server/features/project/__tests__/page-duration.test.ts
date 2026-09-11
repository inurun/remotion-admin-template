import { describe, expect, it } from "vitest";
import type { SavedPage } from "@/_schemas";
import { EYECATCH_TEXT_MIN_DURATION_SEC } from "@/_shared/lib/page/page-timing";
import {
  computeProvisionalPageDurationSec,
  computeReadyPageDurationSec,
  finalizeSequenceDurations,
  MIN_TTS_DURATION_SECONDS,
  resolveSavePageDurationSec,
} from "../page-duration";

function mainPage(overrides: Partial<Extract<SavedPage, { type: "main" }>> = {}): SavedPage {
  return {
    id: "page-1",
    title: "Page",
    type: "main",
    meta: { tags: [] },
    padBeforeSec: 0,
    padAfterSec: 0,
    durationSec: 4,
    richText: null,
    tts: [
      {
        id: "tts-1",
        provider: "voisona",
        text: "Hello",
        padBeforeSec: 0,
        padAfterSec: 0,
        volume: 1,
        audio: { status: "ready", src: "/tts/a.wav", durationSec: 1.1 },
        speech: {},
      },
    ],
    ...overrides,
  };
}

describe("page duration", () => {
  it("keeps previous duration for an existing page with pending tts", () => {
    const page = mainPage({
      tts: [
        {
          id: "tts-1",
          provider: "voisona",
          text: "Hello",
          padBeforeSec: 0,
          padAfterSec: 0,
          volume: 1,
          audio: { status: "pending", src: "/tts/a.wav" },
          speech: {},
        },
      ],
    });

    expect(
      resolveSavePageDurationSec({
        page,
        previousDurationSec: 4,
        adjacentTransitionSec: 0.8,
      }),
    ).toBe(4);
  });

  it("uses pads and transition minimum for a new intro/main page", () => {
    const page = mainPage({
      padBeforeSec: 1,
      padAfterSec: 0.5,
      tts: [
        {
          id: "tts-1",
          provider: "voisona",
          text: "Hello",
          padBeforeSec: 0,
          padAfterSec: 0,
          volume: 1,
          audio: { status: "pending", src: "/tts/a.wav" },
          speech: {},
        },
      ],
    });

    expect(computeProvisionalPageDurationSec(page, 0.8)).toBe(1.5);
    expect(computeProvisionalPageDurationSec(page, 2)).toBe(2);
  });

  it("uses eyecatch minimum without page pads", () => {
    const page: SavedPage = {
      id: "eye",
      title: "Eye",
      type: "eyecatch-text",
      meta: { tags: [] },
      padBeforeSec: 1,
      padAfterSec: 1,
      durationSec: 0,
      richText: null,
      tts: [
        {
          id: "tts-1",
          provider: "voisona",
          text: "Hello",
          padBeforeSec: 0,
          padAfterSec: 0,
          volume: 1,
          audio: { status: "pending", src: "/tts/a.wav" },
          speech: {},
        },
      ],
    };

    expect(computeProvisionalPageDurationSec(page, 0.2)).toBe(EYECATCH_TEXT_MIN_DURATION_SEC);
  });

  it("computes ready-only duration and skips failed tts", () => {
    const page = mainPage({
      padBeforeSec: 0.5,
      padAfterSec: 0.5,
      tts: [
        {
          id: "tts-1",
          provider: "voisona",
          text: "Hello",
          padBeforeSec: 0,
          padAfterSec: 0,
          volume: 1,
          audio: { status: "ready", src: "/tts/a.wav", durationSec: 1 },
          speech: {},
        },
        {
          id: "tts-2",
          provider: "voisona",
          text: "Nope",
          padBeforeSec: 0,
          padAfterSec: 0,
          volume: 1,
          audio: { status: "failed", src: "/tts/b.wav", error: "engine failed" },
          speech: {},
        },
      ],
    });

    expect(computeReadyPageDurationSec(page)).toBe(2);
  });

  it("keeps previous duration for an existing page with failed tts", () => {
    const page = mainPage({
      tts: [
        {
          id: "tts-1",
          provider: "voisona",
          text: "Hello",
          padBeforeSec: 0,
          padAfterSec: 0,
          volume: 1,
          audio: { status: "failed", src: "/tts/a.wav", error: "engine failed" },
          speech: {},
        },
      ],
    });

    expect(
      resolveSavePageDurationSec({
        page,
        previousDurationSec: 4,
        adjacentTransitionSec: 0.8,
      }),
    ).toBe(4);
  });

  it("clamps failed pages to adjacent transitions instead of rejecting save", () => {
    const pages = [
      mainPage({
        id: "page-short",
        durationSec: 0.2,
        tts: [
          {
            id: "tts-1",
            provider: "voisona",
            text: "Hello",
            padBeforeSec: 0,
            padAfterSec: 0,
            volume: 1,
            audio: { status: "failed", src: "/tts/a.wav", error: "engine failed" },
            speech: {},
          },
        ],
      }),
      { id: "tr-1", type: "transition" as const, variant: "slide" as const },
      mainPage({ id: "page-long", durationSec: 3 }),
    ];

    expect(finalizeSequenceDurations(pages)[0]).toMatchObject({
      id: "page-short",
      durationSec: 0.8,
    });
  });

  it("does not go below the minimum tts duration", () => {
    const page = mainPage({
      tts: [],
    });
    expect(computeReadyPageDurationSec(page)).toBe(MIN_TTS_DURATION_SECONDS);
  });
});
