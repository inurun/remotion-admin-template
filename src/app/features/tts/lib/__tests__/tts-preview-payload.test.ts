import { describe, expect, it } from "vitest";
import type { DraftTts } from "@/_schemas";
import { getPreviewPayload } from "@/app/features/tts/lib/tts-preview-payload";

type VoisonaDraftTts = Extract<DraftTts, { provider: "voisona" }>;

function createTts(overrides: Partial<VoisonaDraftTts> = {}): DraftTts {
  return {
    id: "tts",
    provider: "voisona",
    text: "text",
    readText: "",
    voiceName: " voice ",
    voiceVersion: "",
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    speech: {},
    ...overrides,
  };
}

describe("getPreviewPayload", () => {
  it("uses read text before source text", () => {
    expect(getPreviewPayload(createTts({ readText: " read " }), "project")).toMatchObject({
      projectPath: "project",
      text: "read",
      voiceName: "voice",
    });
  });

  it("includes trimmed optional synthesis fields", () => {
    expect(
      getPreviewPayload(
        createTts({
          speech: { analysis: " analyzed " },
          voiceVersion: " version ",
        }),
        "group/demo",
      ),
    ).toEqual({
      provider: "voisona",
      projectPath: "group/demo",
      analysis: "analyzed",
      text: "text",
      voiceName: "voice",
      voiceVersion: "version",
    });
  });

  it("requires a voice name", () => {
    expect(() => getPreviewPayload(createTts({ voiceName: " " }), "project")).toThrow("Voice name");
  });
});
