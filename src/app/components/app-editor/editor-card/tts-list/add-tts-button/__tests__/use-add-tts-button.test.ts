import { describe, expect, it } from "vitest";
import type { VoiceOption } from "@/_schemas";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { createTtsInput } from "@/app/features/tts/lib/create-draft-tts";

describe("createTtsInput", () => {
  it("inherits avatar settings from the source TTS", () => {
    const sourceTts: TtsFormValues = {
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

    expect(createTtsInput(options, sourceTts)).toMatchObject({
      avatar: sourceTts.avatar,
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
    });
  });
});
