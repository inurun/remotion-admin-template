import { describe, expect, it } from "vitest";
import type { VoicePreset } from "@/_schemas";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import {
  getDisplayedTtsSynthesisSettings,
  toStoredTtsSynthesisSettings,
} from "@/app/components/app-editor/config-card/tts-settings-dialog/use-tts-settings-dialog";

const presets: VoicePreset[] = [
  {
    provider: "voicevox",
    voiceName: "3",
    synthesisSettings: { speedScale: 1.2 },
  },
];

function item(
  overrides: Partial<Extract<TtsFormValues, { provider: "voicevox" }>> = {},
): TtsFormValues {
  return {
    id: "tts-1",
    provider: "voicevox",
    text: "Hello",
    voiceName: "3",
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    synthesisSettings: null,
    ...overrides,
  };
}

describe("tts settings dialog values", () => {
  it("shows the project preset when the tts has no override", () => {
    expect(getDisplayedTtsSynthesisSettings(item(), presets)).toEqual({ speedScale: 1.2 });
  });

  it("shows the explicit tts override", () => {
    expect(
      getDisplayedTtsSynthesisSettings(item({ synthesisSettings: { speedScale: 1.4 } }), presets),
    ).toEqual({ speedScale: 1.4 });
  });

  it("stores an edited value as an override and empty fields as null", () => {
    expect(toStoredTtsSynthesisSettings({ speedScale: 1.4 })).toEqual({ speedScale: 1.4 });
    expect(toStoredTtsSynthesisSettings(undefined)).toBeNull();
  });
});
