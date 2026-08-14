import { describe, expect, it } from "vitest";
import type { DraftTts, VoiceOption } from "@/_schemas";
import { createDraftTts } from "@/app/features/tts/lib/create-draft-tts";

describe("createDraftTts", () => {
  it("inherits avatar settings from the source TTS", () => {
    const sourceTts: DraftTts = {
      id: "source",
      provider: "voisona",
      text: "source",
      voiceName: "voice",
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      avatar: {
        base: "normal",
        eyes: "glass",
        mouth: "wavy-opened",
      },
    };
    const options: VoiceOption[] = [
      { provider: "voisona", voiceName: "fallback", displayName: "Fallback" },
    ];

    expect(createDraftTts(options, sourceTts)).toMatchObject({
      avatar: sourceTts.avatar,
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
    });
  });
});
