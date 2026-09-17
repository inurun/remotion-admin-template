import { describe, expect, it } from "vitest";
import { applyTtsVoiceChange } from "../apply-tts-voice-change";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";

function item(): TtsFormValues {
  return {
    id: "tts",
    provider: "voicevox",
    text: "hello",
    readText: "hello",
    voiceName: "3",
    voiceVersion: "1",
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    synthesisSettings: { speedScale: 1.2 },
    speech: { g2p: createG2pItem("hello") },
  };
}

describe("applyTtsVoiceChange", () => {
  it("keeps g2p when switching providers including VoicePeak", () => {
    const g2p = createG2pItem("hello");
    const source = item();

    expect(
      applyTtsVoiceChange(source, {
        provider: "voisona",
        voiceName: "voice",
        voiceVersion: "2",
        displayName: "voice",
      }).speech,
    ).toEqual({ g2p });

    expect(
      applyTtsVoiceChange(source, {
        provider: "voicepeak",
        voiceName: "Kasane Teto",
        displayName: "Kasane Teto",
      }).speech,
    ).toEqual({ g2p });
  });

  it("drops old identity and settings when switching to coeiroink", () => {
    const next = applyTtsVoiceChange(item(), {
      provider: "coeiroink",
      speakerUuid: "speaker-1",
      styleId: 0,
      modelVersion: "1",
      displayName: "カゼヒキ / はな風邪",
      speakerName: "カゼヒキ",
      styleName: "はな風邪",
    });

    expect(next).toMatchObject({
      provider: "coeiroink",
      speakerUuid: "speaker-1",
      styleId: 0,
      modelVersion: "1",
      synthesisSettings: null,
    });
    expect(next).not.toHaveProperty("voiceName");
    expect(next.speech).toEqual({ g2p: createG2pItem("hello") });
  });
});
