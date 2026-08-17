import { describe, expect, it } from "vitest";
import type { VoicePreset } from "@/_schemas";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";
import {
  getEffectiveTtsSynthesisSettings,
  getVoicePresetSettings,
  resolveTtsSynthesisSettings,
  upsertVoicePreset,
} from "@/_shared/project/voice-presets";

const presets: VoicePreset[] = [
  {
    provider: "voisona",
    voiceName: "a",
    synthesisSettings: { speed: 1.2 },
  },
  {
    provider: "voicevox",
    voiceName: "3",
    synthesisSettings: { speedScale: 1.2 },
  },
];

describe("voice presets", () => {
  it("defines seven default presets", () => {
    const defaults = getDefaultVoicePresets();
    expect(defaults).toHaveLength(7);
    expect(defaults.map((preset) => `${preset.provider}:${preset.voiceName}`)).toEqual([
      "voicevox:3",
      "voicevox:46",
      "voicevox:43",
      "voicevox:14",
      "voicevox:113",
      "voicepeak:Kasane Teto",
      "voisona:futaba-minato_ja_JP",
    ]);
    for (const preset of defaults.filter((item) => item.provider === "voicevox")) {
      expect(preset.synthesisSettings).toMatchObject({
        prePhonemeLength: 0,
        postPhonemeLength: 0,
        pauseLengthScale: 0.5,
      });
    }
  });

  it("looks up presets by provider and voiceName", () => {
    expect(
      getVoicePresetSettings(presets, { provider: "voisona", voiceName: "a", voiceVersion: "9" }),
    ).toEqual({ speed: 1.2 });
  });

  it("prefers an exact voiceVersion match", () => {
    const versioned: VoicePreset[] = [
      { provider: "voisona", voiceName: "a", synthesisSettings: { speed: 1 } },
      {
        provider: "voisona",
        voiceName: "a",
        voiceVersion: "2.0.2",
        synthesisSettings: { speed: 1.4 },
      },
    ];

    expect(
      getVoicePresetSettings(versioned, {
        provider: "voisona",
        voiceName: "a",
        voiceVersion: "2.0.2",
      }),
    ).toEqual({ speed: 1.4 });
  });

  it("resolves missing tts synthesis settings from the project preset", () => {
    const item = {
      id: "tts-1",
      provider: "voisona" as const,
      text: "Hello",
      voiceName: "a",
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      synthesisSettings: null,
    };

    expect(getEffectiveTtsSynthesisSettings(item, presets)).toEqual({ speed: 1.2 });
    expect(resolveTtsSynthesisSettings(item, presets).synthesisSettings).toEqual({ speed: 1.2 });
    expect(item.synthesisSettings).toBeNull();
  });

  it("keeps concrete tts synthesis settings over the project preset", () => {
    const item = {
      id: "tts-1",
      provider: "voicevox" as const,
      text: "Hello",
      voiceName: "3",
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      synthesisSettings: { speedScale: 1.4 },
    };

    expect(getEffectiveTtsSynthesisSettings(item, presets)).toEqual({ speedScale: 1.4 });
  });

  it("upserts and removes project presets", () => {
    const next = upsertVoicePreset(
      presets,
      { provider: "voicevox", voiceName: "3" },
      {
        speedScale: 1.5,
      },
    );
    expect(getVoicePresetSettings(next, { provider: "voicevox", voiceName: "3" })).toEqual({
      speedScale: 1.5,
    });

    const removed = upsertVoicePreset(next, { provider: "voicevox", voiceName: "3" }, undefined);
    expect(
      getVoicePresetSettings(removed, { provider: "voicevox", voiceName: "3" }),
    ).toBeUndefined();
  });
});
