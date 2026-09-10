import { describe, expect, it } from "vitest";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { getAdjacentTtsContext } from "@/app/features/tts/lib/adjacent-tts-context";

function createTts(overrides: Partial<TtsFormValues> & Pick<TtsFormValues, "id">): TtsFormValues {
  return {
    provider: "voisona",
    text: "本文",
    readText: "",
    voiceName: "voice",
    voiceVersion: "",
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    speech: {},
    ...overrides,
  } as TtsFormValues;
}

describe("getAdjacentTtsContext", () => {
  it("returns the immediate previous and next TTS", () => {
    expect(
      getAdjacentTtsContext(
        [
          createTts({ id: "tts-1", text: "前", readText: "まえ" }),
          createTts({ id: "tts-2", text: "今" }),
          createTts({ id: "tts-3", text: "次", readText: "つぎ" }),
        ],
        "tts-2",
      ),
    ).toEqual({
      previous: { text: "前", readText: "まえ" },
      next: { text: "次", readText: "つぎ" },
    });
  });

  it("omits previous on the first item and next on the last", () => {
    const items = [
      createTts({ id: "tts-1", text: "先頭" }),
      createTts({ id: "tts-2", text: "末尾" }),
    ];

    expect(getAdjacentTtsContext(items, "tts-1")).toEqual({
      next: { text: "末尾", readText: "" },
    });
    expect(getAdjacentTtsContext(items, "tts-2")).toEqual({
      previous: { text: "先頭", readText: "" },
    });
  });

  it("omits a neighbor with empty text and readText", () => {
    expect(
      getAdjacentTtsContext(
        [
          createTts({ id: "tts-1", text: "  ", readText: "   " }),
          createTts({ id: "tts-2", text: "今" }),
          createTts({ id: "tts-3", text: "", readText: "" }),
        ],
        "tts-2",
      ),
    ).toEqual({});
  });

  it("keeps a VoicePeak neighbor that has text", () => {
    expect(
      getAdjacentTtsContext(
        [
          createTts({
            id: "tts-1",
            provider: "voicepeak",
            text: "前のピーク",
            readText: "",
          }),
          createTts({ id: "tts-2", text: "今" }),
        ],
        "tts-2",
      ),
    ).toEqual({
      previous: { text: "前のピーク", readText: "" },
    });
  });

  it("returns nothing for an unknown TTS", () => {
    expect(getAdjacentTtsContext([createTts({ id: "tts-1" })], "missing")).toEqual({});
  });
});
