import { describe, expect, it } from "vitest";
import { SEQUENCE_TRACK_ID, type SavedSequenceItem, type SavedTimeline } from "@/_schemas";
import {
  TIMELINE_MIN_PIXELS_PER_SECOND,
  buildTimelineLanes,
  flattenNestedClips,
  frameToX,
  getTimelinePixelsPerSecond,
  packOverlappingClips,
  stepFrame,
  xToFrame,
  type TimelineLaneClip,
} from "../timeline-view.lib";

function clip(id: string, startSec: number, durationSec: number): TimelineLaneClip {
  return { id, startSec, durationSec, label: id, kind: "nested" };
}

describe("timeline view", () => {
  it("flattens nested clips onto the parent start", () => {
    expect(
      flattenNestedClips([
        {
          id: "page",
          startSec: 10,
          durationSec: 5,
          clips: [
            { id: "tts", startSec: 1, durationSec: 2, clips: [] },
            {
              id: "group",
              startSec: 0,
              durationSec: 3,
              clips: [{ id: "inner", startSec: 0.5, durationSec: 1, clips: [] }],
            },
          ],
        },
      ]).map((item) => ({ id: item.id, startSec: item.startSec, durationSec: item.durationSec })),
    ).toEqual([
      { id: "tts", startSec: 11, durationSec: 2 },
      { id: "group", startSec: 10, durationSec: 3 },
      { id: "inner", startSec: 10.5, durationSec: 1 },
    ]);
  });

  it("packs overlapping clips onto extra rows", () => {
    expect(
      packOverlappingClips([clip("a", 0, 2), clip("b", 1, 2), clip("c", 2, 1)]).map((row) =>
        row.map((item) => item.id),
      ),
    ).toEqual([["a", "c"], ["b"]]);
  });

  it("builds sequence lanes from timeline tracks", () => {
    const timeline: SavedTimeline = {
      durationSec: 5,
      tracks: [
        {
          id: SEQUENCE_TRACK_ID,
          clips: [
            {
              id: "page-1",
              startSec: 0,
              durationSec: 5,
              clips: [{ id: "tts-1", startSec: 1, durationSec: 2, clips: [] }],
            },
          ],
        },
      ],
    };
    const itemsById: Record<string, SavedSequenceItem> = {
      "page-1": {
        id: "page-1",
        title: "Page 1",
        type: "main",
        meta: { tags: [] },
        padBeforeSec: 0,
        padAfterSec: 0,
        richText: "<p>Hello</p>",
        tts: [
          {
            id: "tts-1",
            provider: "voisona",
            text: "Hello",
            voiceName: "voice",
            padBeforeSec: 0,
            padAfterSec: 0,
            volume: 1,
            audio: { status: "ready", src: "/tts/hello.wav", durationSec: 2 },
            speech: {},
          },
        ],
      },
    };

    const lanes = buildTimelineLanes(timeline, itemsById);
    expect(lanes.map((lane) => ({ id: lane.id, label: lane.label }))).toEqual([
      { id: "sequence:root", label: "sequence" },
      { id: "sequence:nested:0", label: "" },
    ]);
    expect(lanes[0]?.clips).toEqual([
      {
        id: "page-1",
        startSec: 0,
        durationSec: 5,
        label: "Page 1",
        kind: "page",
        pageType: "main",
      },
    ]);
    expect(lanes[1]?.clips).toEqual([
      { id: "tts-1", startSec: 1, durationSec: 2, label: "Hello", kind: "nested" },
    ]);
  });

  it("maps frames across the content width", () => {
    expect(frameToX(0, 100, 11)).toBe(0);
    expect(frameToX(10, 100, 11)).toBe(100);
    expect(xToFrame(50, 100, 11)).toBe(5);
    expect(xToFrame(-10, 100, 11)).toBe(0);
    expect(xToFrame(1000, 100, 11)).toBe(10);
  });

  it("steps one frame and clamps to the duration", () => {
    expect(stepFrame(5, 1, 11)).toBe(6);
    expect(stepFrame(5, -1, 11)).toBe(4);
    expect(stepFrame(0, -1, 11)).toBe(0);
    expect(stepFrame(10, 1, 11)).toBe(10);
  });

  it("keeps a minimum pixels-per-second when the viewport is narrow", () => {
    expect(getTimelinePixelsPerSecond(10, 100)).toBe(TIMELINE_MIN_PIXELS_PER_SECOND);
    expect(getTimelinePixelsPerSecond(10, 400)).toBe(40);
  });
});
