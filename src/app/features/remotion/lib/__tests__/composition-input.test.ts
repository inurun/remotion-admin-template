import { describe, expect, it } from "vitest";
import { EMPTY_TIMELINE } from "@/_schemas";
import { DEFAULT_PROJECT_META, DEFAULT_VOICE_PRESETS } from "@/_schemas";
import { buildRemotionInputProps } from "../composition-input";

describe("buildRemotionInputProps", () => {
  it("always includes schedules alongside project and timeline", () => {
    const project = {
      meta: DEFAULT_PROJECT_META,
      pages: [],
      bgm: [],
      voicePresets: DEFAULT_VOICE_PRESETS,
    };
    expect(buildRemotionInputProps({ project, timeline: EMPTY_TIMELINE })).toEqual({
      project,
      timeline: EMPTY_TIMELINE,
      schedules: { items: [] },
    });
  });
});
