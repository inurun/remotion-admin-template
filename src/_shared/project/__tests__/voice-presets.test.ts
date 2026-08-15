import { describe, expect, it } from "vitest";
import type { DraftPage, VoicePreset } from "@/_schemas";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";
import {
  getVoicePresetSettings,
  resolveProjectSynthesisSettings,
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
        postPhonemeLength: 0.1,
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
    expect(
      resolveTtsSynthesisSettings(
        {
          id: "tts-1",
          provider: "voisona",
          text: "Hello",
          voiceName: "a",
          padBeforeSec: 0,
          padAfterSec: 0,
          volume: 1,
          synthesisSettings: null,
        },
        presets,
      ).synthesisSettings,
    ).toEqual({ speed: 1.2 });
  });

  it("keeps concrete tts synthesis settings over the project preset", () => {
    expect(
      resolveTtsSynthesisSettings(
        {
          id: "tts-1",
          provider: "voicevox",
          text: "Hello",
          voiceName: "3",
          padBeforeSec: 0,
          padAfterSec: 0,
          volume: 1,
          synthesisSettings: { speedScale: 1.4 },
        },
        presets,
      ).synthesisSettings,
    ).toEqual({ speedScale: 1.4 });
  });

  it("resolves a project before synthesis", () => {
    const project = resolveProjectSynthesisSettings({
      meta: {
        title: "project",
        description: "",
        width: 1920,
        height: 1080,
        weather: {},
        niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
      },
      bgm: [],
      voicePresets: [
        {
          provider: "voisona",
          voiceName: "a",
          synthesisSettings: { volume: 0.8 },
        },
      ],
      pages: [
        {
          id: "page-1",
          title: "Page",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              voiceName: "a",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
            },
          ],
        },
      ],
    });

    expect((project.pages[0] as DraftPage).tts[0]?.synthesisSettings).toEqual({ volume: 0.8 });
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
