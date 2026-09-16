import { describe, expect, it } from "vitest";
import type { SavedPage, SavedProject } from "@/_schemas";
import { EMPTY_TIMELINE, SEQUENCE_TRACK_ID, savedPageSchema } from "@/_schemas";
import { EYECATCH_TEXT_MIN_DURATION_SEC, MIN_TTS_DURATION_SECONDS } from "@/constants";
import { toTimeline } from "../to-timeline";

function tts(
  id: string,
  durationSec: number,
  text: string,
  voiceName = "zunda",
): Extract<SavedPage, { type: "main" }>["tts"][number] {
  return {
    id,
    provider: "voisona",
    text,
    voiceName,
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    audio: { status: "ready", src: `/tts/${id}.wav`, durationSec },
    speech: {},
  };
}

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

  it("lays out comments groups independently of tts array order", () => {
    const page = savedPageSchema.parse({
      id: "comments",
      title: "Comments",
      type: "comments",
      meta: {
        tags: [],
        commentReader: { provider: "voisona", voiceName: "zunda" },
        niconico: { videoId: "sm1", fetchedAt: "2026-09-16T00:00:00.000Z" },
      },
      comments: [
        {
          id: "sm1:thread:main:1",
          threadId: "thread",
          fork: "main",
          no: 1,
          body: "うぽつ",
          vposMs: 0,
          postedAt: "2026-09-16T00:00:00.000Z",
        },
        {
          id: "sm1:thread:main:2",
          threadId: "thread",
          fork: "main",
          no: 2,
          body: "質問",
          vposMs: 1,
          postedAt: "2026-09-16T00:00:01.000Z",
        },
      ],
      commentGroups: [
        {
          id: "g1",
          commentIds: ["sm1:thread:main:1"],
          displayText: null,
          readingTtsId: "r1",
          ttsIds: ["t1", "t2"],
          minDurationSec: 3,
        },
        {
          id: "g2",
          commentIds: ["sm1:thread:main:2"],
          displayText: null,
          readingTtsId: "r2",
          ttsIds: [],
          minDurationSec: 3,
        },
      ],
      padBeforeSec: 1,
      padAfterSec: 1,
      richText: null,
      tts: [
        tts("t2", 2, "今回もよろしくね。", "himari"),
        tts("r1", 1, "うぽつ"),
        tts("t1", 1, "ありがとう", "himari"),
        tts("r2", 1, "質問"),
      ],
    });

    const clip = toTimeline(project([page])).tracks[0]?.clips[0];
    expect(clip?.durationSec).toBe(9);
    expect(
      clip?.clips.map(({ id, startSec, durationSec }) => ({ id, startSec, durationSec })),
    ).toEqual([
      { id: "r1", startSec: 1, durationSec: 1 },
      { id: "t1", startSec: 2, durationSec: 1 },
      { id: "t2", startSec: 3, durationSec: 2 },
      { id: "g1", startSec: 0, durationSec: 5 },
      { id: "r2", startSec: 5, durationSec: 1 },
      { id: "g2", startSec: 5, durationSec: 3 },
    ]);
    expect(page).not.toHaveProperty("durationSec");
  });

  it("keeps a silent comments group at min duration when reading is off", () => {
    const page = savedPageSchema.parse({
      id: "comments",
      title: "Comments",
      type: "comments",
      meta: {
        tags: [],
        commentReader: null,
        niconico: { videoId: "sm1", fetchedAt: "2026-09-16T00:00:00.000Z" },
      },
      comments: [
        {
          id: "sm1:thread:main:1",
          threadId: "thread",
          fork: "main",
          no: 1,
          body: "うぽつ",
          vposMs: 0,
          postedAt: "2026-09-16T00:00:00.000Z",
        },
        {
          id: "sm1:thread:main:2",
          threadId: "thread",
          fork: "main",
          no: 2,
          body: "質問",
          vposMs: 1,
          postedAt: "2026-09-16T00:00:01.000Z",
        },
      ],
      commentGroups: [
        {
          id: "g1",
          commentIds: ["sm1:thread:main:1"],
          displayText: null,
          readingTtsId: null,
          ttsIds: ["t1", "t2"],
          minDurationSec: 3,
        },
        {
          id: "g2",
          commentIds: ["sm1:thread:main:2"],
          displayText: null,
          readingTtsId: null,
          ttsIds: [],
          minDurationSec: 3,
        },
      ],
      padBeforeSec: 1,
      padAfterSec: 1,
      richText: null,
      tts: [tts("t1", 1, "ありがとう", "himari"), tts("t2", 2, "よろしく", "himari")],
    });

    expect(toTimeline(project([page])).tracks[0]?.clips[0]?.durationSec).toBe(8);
  });

  it("does not freeze comments duration when audio is still pending", () => {
    const page = savedPageSchema.parse({
      id: "comments",
      title: "Comments",
      type: "comments",
      meta: {
        tags: [],
        commentReader: { provider: "voisona", voiceName: "zunda" },
        niconico: { videoId: "sm1", fetchedAt: "2026-09-16T00:00:00.000Z" },
      },
      comments: [
        {
          id: "sm1:thread:main:1",
          threadId: "thread",
          fork: "main",
          no: 1,
          body: "うぽつ",
          vposMs: 0,
          postedAt: "2026-09-16T00:00:00.000Z",
        },
      ],
      commentGroups: [
        {
          id: "g1",
          commentIds: ["sm1:thread:main:1"],
          displayText: null,
          readingTtsId: "r1",
          ttsIds: [],
          minDurationSec: 3,
        },
      ],
      padBeforeSec: 1,
      padAfterSec: 1,
      richText: null,
      tts: [
        {
          id: "r1",
          provider: "voisona",
          text: "うぽつ",
          voiceName: "zunda",
          padBeforeSec: 0,
          padAfterSec: 0,
          volume: 1,
          audio: { status: "pending", src: "/tts/r1.wav" },
          speech: {},
        },
      ],
    });

    const timeline = toTimeline(project([page]), {
      ...EMPTY_TIMELINE,
      tracks: [
        {
          id: SEQUENCE_TRACK_ID,
          clips: [{ id: "comments", startSec: 0, durationSec: 99, clips: [] }],
        },
      ],
    });
    expect(timeline.tracks[0]?.clips[0]?.durationSec).toBe(5);
    expect(timeline.tracks[0]?.clips[0]?.clips).toEqual([
      {
        id: "r1",
        startSec: 1,
        durationSec: MIN_TTS_DURATION_SECONDS,
        clips: [],
      },
      { id: "g1", startSec: 0, durationSec: 4, clips: [] },
    ]);
  });
});
