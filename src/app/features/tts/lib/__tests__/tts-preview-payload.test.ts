import { describe, expect, it } from "vitest";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { getPreviewPayload } from "@/app/features/tts/lib/tts-preview-payload";
import { resolveTtsSynthesisSettings } from "@/_shared/project/voice-presets";

type VoisonaTtsInput = Extract<TtsFormValues, { provider: "voisona" }>;

function createTts(overrides: Partial<VoisonaTtsInput> = {}): TtsFormValues {
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
          speech: { g2p: createG2pItem("analyzed") },
          voiceVersion: " version ",
        }),
        "group/demo",
      ),
    ).toEqual({
      provider: "voisona",
      projectPath: "group/demo",
      g2p: createG2pItem("analyzed"),
      text: "text",
      voiceName: "voice",
      voiceVersion: "version",
    });
  });

  it("includes synthesis settings without mutating the source tts", () => {
    const item = createTts({
      synthesisSettings: { speed: 1.2 },
    });

    expect(getPreviewPayload(item, "project")).toMatchObject({
      synthesisSettings: { speed: 1.2 },
    });
    expect(item.synthesisSettings).toEqual({ speed: 1.2 });
  });

  it("resolves preset settings for preview without writing them onto the tts", () => {
    const item = createTts({
      voiceName: "a",
      synthesisSettings: null,
    });

    const payload = getPreviewPayload(
      resolveTtsSynthesisSettings(item, [
        { provider: "voisona", voiceName: "a", synthesisSettings: { speed: 1.2 } },
      ]),
      "project",
    );

    expect(payload.synthesisSettings).toEqual({ speed: 1.2 });
    expect(item.synthesisSettings).toBeNull();
  });

  it("requires a voice name", () => {
    expect(() => getPreviewPayload(createTts({ voiceName: " " }), "project")).toThrow("Voice name");
  });
});
