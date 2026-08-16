import { describe, expect, it, vi } from "vitest";
import type { DraftTts, VoiceOption } from "@/_schemas";
import { createDraftTts } from "@/app/features/tts/lib/create-draft-tts";

vi.mock("@/_shared/lib/utils", () => ({
  createUuid: () => "new-tts-id",
}));

function voice(voiceName: string, voiceVersion = ""): VoiceOption {
  return {
    provider: "voisona",
    voiceName,
    voiceVersion,
    displayName: voiceName,
  };
}

function sourceTts(overrides: Partial<Extract<DraftTts, { provider: "voisona" }>> = {}): DraftTts {
  return {
    id: "source",
    provider: "voisona",
    text: "hello",
    readText: "hello",
    voiceName: "source-voice",
    voiceVersion: "1",
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    synthesisSettings: null,
    speech: {},
    ...overrides,
  };
}

describe("createDraftTts", () => {
  it("inherits voice from the source TTS", () => {
    expect(createDraftTts([voice("fallback")], sourceTts())).toEqual({
      id: "new-tts-id",
      provider: "voisona",
      text: "",
      readText: "",
      voiceName: "source-voice",
      voiceVersion: "1",
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      synthesisSettings: null,
      speech: {},
    });
  });

  it("falls back to the first catalog voice when source has no voice", () => {
    expect(createDraftTts([voice("fallback", "2")], sourceTts({ voiceName: "" }))).toEqual({
      id: "new-tts-id",
      provider: "voisona",
      text: "",
      readText: "",
      voiceName: "fallback",
      voiceVersion: "2",
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      synthesisSettings: null,
      speech: {},
    });
  });

  it("uses an empty voice when no source or catalog voice is available", () => {
    expect(createDraftTts([], undefined)).toEqual({
      id: "new-tts-id",
      provider: "voisona",
      text: "",
      readText: "",
      voiceName: "",
      voiceVersion: "",
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      synthesisSettings: null,
      speech: {},
    });
  });
});
