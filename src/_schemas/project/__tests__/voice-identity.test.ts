import { describe, expect, it } from "vitest";
import {
  getVoiceId,
  getVoiceMatchKey,
  parseVoiceId,
  copyVoiceIdentity,
  hasVoiceIdentity,
} from "@/_schemas/project/voice-identity";
import { coeiroinkSynthesisSettingsSchema } from "@/_schemas/project/primitives";
import { savedTtsSchema } from "@/_schemas/project/tts";

describe("coeiroink voice identity", () => {
  const left = {
    provider: "coeiroink" as const,
    speakerUuid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    styleId: 0,
    modelVersion: "1.0.0",
  };
  const right = {
    ...left,
    speakerUuid: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  };

  it("distinguishes uuid, style, and version in ids", () => {
    expect(getVoiceId(left)).toBe("coeiroink::aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa::0::1.0.0");
    expect(getVoiceMatchKey(left)).toBe("coeiroink::aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa::0");
    expect(getVoiceId(left)).not.toBe(getVoiceId({ ...left, modelVersion: "2.0.0" }));
    expect(getVoiceId(left)).not.toBe(getVoiceId({ ...left, styleId: 1 }));
    expect(getVoiceId(left)).not.toBe(getVoiceId(right));
    expect(getVoiceMatchKey(left)).not.toBe(getVoiceMatchKey(right));
  });

  it("parses opaque speaker ids without requiring rfc uuid", () => {
    const id = getVoiceId({
      provider: "coeiroink",
      speakerUuid: "not-a-uuid",
      styleId: 2,
      modelVersion: "v",
    });
    expect(parseVoiceId(id)).toEqual({
      provider: "coeiroink",
      speakerUuid: "not-a-uuid",
      styleId: 2,
      modelVersion: "v",
    });
  });

  it("copies identity without leftover named voice fields", () => {
    expect(copyVoiceIdentity(left)).toEqual(left);
    expect(copyVoiceIdentity(left)).not.toHaveProperty("voiceName");
  });
});

describe("coeiroink saved tts schema", () => {
  it("accepts opaque speaker id, style, version, and settings only on the coeiroink branch", () => {
    expect(
      savedTtsSchema.parse({
        id: "tts",
        provider: "coeiroink",
        text: "hello",
        speakerUuid: "not-a-uuid",
        styleId: 0,
        modelVersion: "1",
        synthesisSettings: { speedScale: 1.2, outputSamplingRate: 44100 },
        audio: { status: "ready", src: "/tts/a.wav", durationSec: 1 },
      }),
    ).toMatchObject({
      speakerUuid: "not-a-uuid",
      styleId: 0,
      modelVersion: "1",
    });
  });

  it("requires coeiroink identity fields instead of named voice fields", () => {
    expect(() =>
      savedTtsSchema.parse({
        id: "tts",
        provider: "coeiroink",
        text: "hello",
        voiceName: "3",
        audio: { status: "ready", src: "/tts/a.wav", durationSec: 1 },
      }),
    ).toThrow();
  });

  it("rejects invalid settings", () => {
    expect(() => coeiroinkSynthesisSettingsSchema.parse({ speedScale: 0 })).toThrow();
    expect(() => coeiroinkSynthesisSettingsSchema.parse({ outputSamplingRate: 1.5 })).toThrow();
    expect(
      hasVoiceIdentity({ provider: "coeiroink", speakerUuid: " ", styleId: 0, modelVersion: "1" }),
    ).toBe(false);
  });
});
