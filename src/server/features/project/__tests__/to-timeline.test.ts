import { describe, expect, it } from "vitest";
import type { SavedPage, SavedProject } from "@/_schemas";
import { EMPTY_TIMELINE, SEQUENCE_TRACK_ID, savedPageSchema } from "@/_schemas";
import { EYECATCH_TEXT_MIN_DURATION_SEC, MIN_TTS_DURATION_SECONDS } from "@/constants";
import { toTimeline } from "../to-timeline";

function mainPage(overrides: Partial<Extract<SavedPage, { type: "main" }>> = {}): SavedPage {
  return {
    id: "page-1",
    title: "Page",
    type: "main",
    meta: { tags: [] },
    padBeforeSec: 0,
    padAfterSec: 0,
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

function project(pages: SavedProject["pages"]): SavedProject {
  return {
    meta: {
      title: "p",
      description: "",
      width: 1920,
      height: 1080,
      weather: {},
      niconico: {
        title: "",
        description: "",
        thumbnailTime: "00:00.000",
        parentWorkIds: [],
        tags: [],
      },
    },
    bgm: [],
    pages,
    voicePresets: {},
  };
}

describe("toTimeline", () => {
  it("keeps previous duration for an existing page with pending tts", () => {
    const timeline = toTimeline(
      project([
        mainPage({
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
        }),
      ]),
      {
        ...EMPTY_TIMELINE,
        tracks: [
          {
            id: SEQUENCE_TRACK_ID,
            clips: [{ id: "page-1", startSec: 0, durationSec: 4, clips: [] }],
          },
        ],
      },
    );

    expect(timeline.tracks[0]?.clips[0]?.durationSec).toBe(4);
  });

  it("uses pads and transition minimum for a new intro/main page", () => {
    const timeline = toTimeline(
      project([
        mainPage({
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
        }),
      ]),
    );
    expect(timeline.tracks[0]?.clips[0]?.durationSec).toBe(1.5);
  });

  it("uses eyecatch minimum without page pads", () => {
    const page: SavedPage = {
      id: "eye",
      title: "Eye",
      type: "eyecatch-text",
      meta: { tags: [] },
      padBeforeSec: 1,
      padAfterSec: 1,
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
    expect(toTimeline(project([page])).tracks[0]?.clips[0]?.durationSec).toBe(
      EYECATCH_TEXT_MIN_DURATION_SEC,
    );
  });

  it("computes ready duration from playable tts", () => {
    const timeline = toTimeline(
      project([
        mainPage({
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
          ],
        }),
      ]),
    );
    expect(timeline.tracks[0]?.clips[0]?.durationSec).toBe(2);
  });

  it("does not go below the minimum tts duration", () => {
    const timeline = toTimeline(
      project([
        {
          id: "eye",
          title: "Eye",
          type: "eyecatch-text",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: null,
          tts: [],
        },
      ]),
    );
    expect(timeline.tracks[0]?.clips[0]?.durationSec).toBe(EYECATCH_TEXT_MIN_DURATION_SEC);
    expect(timeline.tracks[0]?.clips[0]?.durationSec).toBeGreaterThanOrEqual(
      MIN_TTS_DURATION_SECONDS,
    );
  });

  it("writes outro visual clips and keeps hold/fade in page duration", () => {
    const page = savedPageSchema.parse({
      id: "outro",
      title: "Outro",
      type: "outro",
      meta: {
        tags: [],
        blocks: [
          { id: "a", url: "https://a.example", impression: "" },
          { id: "b", url: "https://b.example", impression: "" },
          { id: "c", url: "https://c.example", impression: "" },
        ],
      },
      padBeforeSec: 0,
      padAfterSec: 0,
      richText: null,
      tts: [],
    });
    const clip = toTimeline(project([page])).tracks[0]?.clips[0];
    expect(
      clip?.clips.map(({ id, startSec, durationSec }) => ({ id, startSec, durationSec })),
    ).toEqual([
      { id: "outro-page-0", startSec: 0.5, durationSec: 5 },
      { id: "outro-page-1", startSec: 5.5, durationSec: 5 },
    ]);
    expect(clip?.durationSec).toBe(10.5);
  });

  it("sizes endcard from advertiser pages minus slide overlap", () => {
    const page = savedPageSchema.parse({
      id: "endcard",
      title: "Endcard",
      type: "endcard",
      meta: {
        tags: [],
        nicoadSource: "",
        credits: [],
        advertisers: [
          {
            id: "ad-1",
            identityKey: "user:1",
            introductionCount: 1,
            name: "Ada",
            message: "",
          },
          {
            id: "ad-2",
            identityKey: "user:2",
            introductionCount: 1,
            name: "Bob",
            message: "",
          },
        ],
        messages: [],
      },
      padBeforeSec: 0.5,
      padAfterSec: 0.25,
      richText: null,
      tts: [],
    });
    const clip = toTimeline(project([page])).tracks[0]?.clips[0];
    expect(
      clip?.clips.map(({ id, startSec, durationSec }) => ({ id, startSec, durationSec })),
    ).toEqual([
      { id: "endcard-page-0", startSec: 0, durationSec: 8 },
      { id: "endcard-page-1", startSec: 7.2, durationSec: 8 },
    ]);
    expect(clip?.durationSec).toBe(15.95);
  });
});
