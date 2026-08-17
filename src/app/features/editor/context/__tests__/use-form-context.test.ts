import { describe, expect, it } from "vitest";
import type { SavedTts } from "@/_schemas";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { toTtsFormValues } from "../../lib/project-form-conversion";

describe("form context conversion", () => {
  it("keeps saved TTS avatar settings in draft values", () => {
    const item: SavedTts = {
      id: "tts",
      provider: "voisona",
      text: "hello",
      readText: "hello",
      voiceName: "voice",
      padBeforeSec: 0.1,
      padAfterSec: -0.2,
      volume: 0.8,
      durationSec: 1,
      audio: { src: "/tts/hello.wav" },
      speech: { g2p: createG2pItem("analysis") },
      avatar: {
        base: "normal",
        eyes: "sad",
        mouth: "sad-opened",
      },
    };

    expect(toTtsFormValues(item)).toMatchObject({
      avatar: item.avatar,
      padBeforeSec: item.padBeforeSec,
      padAfterSec: item.padAfterSec,
      volume: item.volume,
    });
  });
});
