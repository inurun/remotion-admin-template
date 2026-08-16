import { describe, expect, it } from "vitest";
import { applyTtsVoiceChange } from "../apply-tts-voice-change";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import type { DraftTts } from "@/_schemas";

function item(): DraftTts {
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
      }).speech,
    ).toEqual({ g2p });

    expect(
      applyTtsVoiceChange(source, {
        provider: "voicepeak",
        voiceName: "Kasane Teto",
      }).speech,
    ).toEqual({ g2p });
  });
});
