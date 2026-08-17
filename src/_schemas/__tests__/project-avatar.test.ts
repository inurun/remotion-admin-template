import { describe, expect, it } from "vitest";
import { ttsFormSchema } from "@/app/features/tts/model/tts-form-schema";
import { savedTtsSchema } from "../project";

describe("project avatar schema", () => {
  it("accepts avatar appearance settings without actor type", () => {
    expect(
      ttsFormSchema.parse({
        id: "tts",
        provider: "voisona",
        text: "hello",
        avatar: {
          base: "normal",
          eyes: "angry",
          mouth: "angry-opened",
        },
      }),
    ).toMatchObject({
      avatar: {
        base: "normal",
        eyes: "angry",
        mouth: "angry-opened",
      },
    });
  });

  it("rejects empty avatar appearance values", () => {
    expect(() =>
      ttsFormSchema.parse({
        id: "tts",
        provider: "voisona",
        text: "hello",
        avatar: {
          base: "",
          eyes: "opened",
          mouth: "opened",
        },
      }),
    ).toThrow();
  });

  it("allows TTS without avatar settings", () => {
    expect(
      savedTtsSchema.parse({
        id: "tts",
        provider: "voisona",
        text: "hello",
        durationSec: 1,
        audio: { src: "/tts/hello.wav" },
      }),
    ).not.toHaveProperty("avatar");
  });

  it("fills TTS playback defaults", () => {
    expect(
      savedTtsSchema.parse({
        id: "tts",
        provider: "voisona",
        text: "hello",
        durationSec: 1,
        audio: { src: "/tts/hello.wav" },
      }),
    ).toMatchObject({
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
    });
  });
});
