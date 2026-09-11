import { describe, expect, it } from "vitest";
import { savedTtsSchema } from "@/_schemas/project/tts";

describe("saved TTS audio schema", () => {
  const base = {
    id: "tts",
    provider: "voisona" as const,
    text: "hello",
  };

  it("requires src for pending and rejects duration or error", () => {
    expect(
      savedTtsSchema.parse({
        ...base,
        audio: { status: "pending", src: "/tts/a.wav" },
      }).audio,
    ).toEqual({ status: "pending", src: "/tts/a.wav" });

    expect(() =>
      savedTtsSchema.parse({
        ...base,
        audio: { status: "pending", src: "/tts/a.wav", durationSec: 1 },
      }),
    ).toThrow();
    expect(() =>
      savedTtsSchema.parse({
        ...base,
        audio: { status: "pending", src: "/tts/a.wav", error: "nope" },
      }),
    ).toThrow();
  });

  it("requires analysisKey for analyzing and rejects src, duration, or error", () => {
    expect(
      savedTtsSchema.parse({
        ...base,
        audio: { status: "analyzing", analysisKey: "key-1" },
      }).audio,
    ).toEqual({ status: "analyzing", analysisKey: "key-1" });

    expect(() =>
      savedTtsSchema.parse({
        ...base,
        audio: { status: "analyzing" },
      }),
    ).toThrow();
    expect(() =>
      savedTtsSchema.parse({
        ...base,
        audio: { status: "analyzing", analysisKey: "key-1", src: "/tts/a.wav" },
      }),
    ).toThrow();
  });

  it("requires src and durationSec for ready", () => {
    expect(
      savedTtsSchema.parse({
        ...base,
        audio: { status: "ready", src: "/tts/a.wav", durationSec: 1.2 },
      }).audio,
    ).toEqual({ status: "ready", src: "/tts/a.wav", durationSec: 1.2 });

    expect(() =>
      savedTtsSchema.parse({
        ...base,
        audio: { status: "ready", src: "/tts/a.wav" },
      }),
    ).toThrow();
  });

  it("requires src and error for failed and rejects duration", () => {
    expect(
      savedTtsSchema.parse({
        ...base,
        audio: { status: "failed", src: "/tts/a.wav", error: "engine failed" },
      }).audio,
    ).toEqual({ status: "failed", src: "/tts/a.wav", error: "engine failed" });

    expect(() =>
      savedTtsSchema.parse({
        ...base,
        audio: { status: "failed", src: "/tts/a.wav", error: "engine failed", durationSec: 1 },
      }),
    ).toThrow();
  });
});
