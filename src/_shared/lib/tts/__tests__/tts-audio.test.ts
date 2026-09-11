import { describe, expect, it } from "vitest";
import { isUnresolvedTtsAudio, projectHasUnresolvedAudio } from "@/_shared/lib/tts/tts-audio";
import type { SavedTtsAudio } from "@/_schemas";

describe("unresolved TTS audio", () => {
  it("treats analyzing and pending as unresolved", () => {
    expect(isUnresolvedTtsAudio({ status: "analyzing", analysisKey: "k" })).toBe(true);
    expect(isUnresolvedTtsAudio({ status: "pending", src: "/tts/a.wav" })).toBe(true);
    expect(isUnresolvedTtsAudio({ status: "ready", src: "/tts/a.wav", durationSec: 1 })).toBe(
      false,
    );
    expect(isUnresolvedTtsAudio({ status: "failed", src: "/tts/a.wav", error: "x" })).toBe(false);
  });

  it("detects unresolved audio on a project", () => {
    const analyzing: SavedTtsAudio = { status: "analyzing", analysisKey: "k" };
    expect(
      projectHasUnresolvedAudio({
        pages: [
          {
            id: "page-1",
            title: "Page",
            type: "main",
            meta: { tags: [] },
            padBeforeSec: 0,
            padAfterSec: 0,
            durationSec: 1,
            richText: null,
            tts: [
              {
                id: "tts-1",
                provider: "voisona",
                text: "Hello",
                padBeforeSec: 0,
                padAfterSec: 0,
                volume: 1,
                audio: analyzing,
                speech: {},
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });
});
