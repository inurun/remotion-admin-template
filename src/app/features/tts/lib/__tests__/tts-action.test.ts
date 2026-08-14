import { describe, expect, it } from "vitest";
import type { DraftTts } from "@/_schemas";
import { isTtsActionReady } from "@/app/features/tts/lib/tts-action";

type VoisonaDraftTts = Extract<DraftTts, { provider: "voisona" }>;

function createTts(overrides: Partial<VoisonaDraftTts> = {}): DraftTts {
  return {
    id: "tts",
    provider: "voisona",
    text: "こんにちは",
    readText: "",
    voiceName: "voice",
    voiceVersion: "",
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    speech: {},
    ...overrides,
  };
}

describe("isTtsActionReady", () => {
  it("accepts a runnable TTS item", () => {
    expect(isTtsActionReady(createTts(), true)).toBe(true);
  });

  it("rejects missing items and disabled commands", () => {
    expect(isTtsActionReady(undefined, true)).toBe(false);
    expect(isTtsActionReady(createTts(), false)).toBe(false);
  });

  it("requires text and voice name", () => {
    expect(isTtsActionReady(createTts({ text: "  " }), true)).toBe(false);
    expect(isTtsActionReady(createTts({ voiceName: "" }), true)).toBe(false);
  });
});
