import { describe, expect, it } from "vitest";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { buildVoicevoxSynthesisRequest, buildVoisonaSynthesisRequest } from "../synthesis-settings";

const item = createG2pItem("hello");

describe("synthesis request builders", () => {
  it("merges VOICEVOX defaults and keeps pauseLength null", () => {
    const request = buildVoicevoxSynthesisRequest({
      item,
      speaker: 3,
      synthesisSettings: {
        speedScale: 1.4,
        pauseLength: null,
      },
    });

    expect(request).toEqual({
      schema_version: "1",
      item,
      speaker: 3,
      synthesis_settings: {
        outputStereo: true,
        prePhonemeLength: 0,
        postPhonemeLength: 0.1,
        pauseLengthScale: 0.5,
        speedScale: 1.4,
        pauseLength: null,
      },
    });
    expect(JSON.stringify(request)).toContain('"pauseLength":null');
  });

  it("omits VoiSona voice_version and empty settings", () => {
    expect(
      buildVoisonaSynthesisRequest({
        item,
        voiceName: "futaba-minato_ja_JP",
      }),
    ).toEqual({
      schema_version: "1",
      item,
      voice_name: "futaba-minato_ja_JP",
    });
  });

  it("forwards VoiSona voice_version and settings without nulls", () => {
    const request = buildVoisonaSynthesisRequest({
      item,
      voiceName: "futaba-minato_ja_JP",
      voiceVersion: "2.0.2",
      synthesisSettings: {
        speed: 1.4,
        huskiness: 0.7,
        style_weights: [0, 1],
      },
    });

    expect(request).toEqual({
      schema_version: "1",
      item,
      voice_name: "futaba-minato_ja_JP",
      voice_version: "2.0.2",
      synthesis_settings: {
        speed: 1.4,
        huskiness: 0.7,
        style_weights: [0, 1],
      },
    });
    expect(JSON.stringify(request)).not.toContain("null");
  });
});
