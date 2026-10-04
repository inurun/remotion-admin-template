import { describe, expect, it } from "vitest";
import { EMPTY_TIMELINE } from "@/_schemas";
import { DEFAULT_PROJECT_META, DEFAULT_VOICE_PRESETS } from "@/_schemas";
import { buildVideoInputProps } from "../composition-input";

describe("buildVideoInputProps", () => {
  it("always includes schedules alongside project and timeline", () => {
    const project = {
      meta: DEFAULT_PROJECT_META,
      pages: [],
      bgm: [],
      voicePresets: DEFAULT_VOICE_PRESETS,
    };
    expect(buildVideoInputProps({ project, timeline: EMPTY_TIMELINE })).toEqual({
      project,
      timeline: EMPTY_TIMELINE,
      schedules: { items: [] },
    });
  });
});
