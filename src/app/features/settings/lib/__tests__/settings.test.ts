import { describe, expect, it } from "vitest";
import type { DraftPage, VoiceOption } from "@/_schemas";
import { eventMatchesHotkey, findDuplicateHotkeys } from "@/app/features/settings/lib/hotkeys";
import {
  getDefaultVoice,
  getVisibleVoiceOptions,
  mergeVoiceOrder,
  resolveTtsSynthesisSettings,
  resolveProjectSynthesisSettings,
} from "@/app/features/settings/lib/settings";

function voice(voiceName: string, displayName: string, voiceVersion = ""): VoiceOption {
  return { provider: "voisona", voiceName, voiceVersion, displayName };
}

describe("settings voices", () => {
  it("keeps existing voice order without appending catalog voices", () => {
    const voices = [voice("a", "A"), voice("b", "B"), voice("c", "C")];

    expect(mergeVoiceOrder(["voisona::b::", "voisona::a::"], voices)).toEqual([
      "voisona::b::",
      "voisona::a::",
    ]);
  });

  it("drops selected voices missing from the catalog", () => {
    const voices = [voice("a", "A")];

    expect(mergeVoiceOrder(["voisona::b::", "voisona::a::"], voices)).toEqual(["voisona::a::"]);
  });

  it("hides stale voices from visible options", () => {
    const options = getVisibleVoiceOptions({
      voices: [voice("a", "A")],
      voiceOrder: ["stale::", "voisona::a::"],
      voiceSettings: {
        "voisona::a::": { label: "Actor A", alias: "", hotkey: "" },
        "stale::": { label: "Stale", alias: "", hotkey: "ctrl+1" },
      },
    });

    expect(options).toEqual([
      { provider: "voisona", voiceName: "a", voiceVersion: "", displayName: "Actor A" },
    ]);
  });

  it("hides voices without a custom label from visible options", () => {
    const options = getVisibleVoiceOptions({
      voices: [voice("a", "A"), voice("b", "B")],
      voiceOrder: ["voisona::a::", "voisona::b::"],
      voiceSettings: {
        "voisona::b::": { label: "Actor B", alias: "", hotkey: "" },
      },
    });

    expect(options).toEqual([
      { provider: "voisona", voiceName: "b", voiceVersion: "", displayName: "Actor B" },
    ]);
  });

  it("uses the first ordered voice as the default voice", () => {
    const options = getVisibleVoiceOptions({
      voices: [voice("a", "A"), voice("b", "B")],
      voiceOrder: ["voisona::b::", "voisona::a::"],
      voiceSettings: {
        "voisona::a::": { label: "Actor A", alias: "", hotkey: "" },
        "voisona::b::": { label: "Actor B", alias: "", hotkey: "" },
      },
    });

    expect(getDefaultVoice(options)?.voiceName).toBe("b");
  });

  it("resolves missing tts synthesis settings from the voice preset", () => {
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
        {
          "voisona::a::": {
            label: "Actor A",
            alias: "",
            hotkey: "",
            synthesisSettings: { speed: 1.2 },
          },
        },
      ).synthesisSettings,
    ).toEqual({ speed: 1.2 });
  });

  it("keeps concrete tts synthesis settings over the voice preset", () => {
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
        {
          "voicevox::3::": {
            label: "Actor A",
            alias: "",
            hotkey: "",
            synthesisSettings: { speedScale: 1.2 },
          },
        },
      ).synthesisSettings,
    ).toEqual({ speedScale: 1.4 });
  });

  it("resolves a project before synthesis", () => {
    const project = resolveProjectSynthesisSettings(
      {
        meta: {
          title: "project",
          description: "",
          width: 1920,
          height: 1080,
          weather: {},
          niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
        },
        bgm: [],
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
      },
      {
        "voisona::a::": {
          label: "Actor A",
          alias: "",
          hotkey: "",
          synthesisSettings: { volume: 0.8 },
        },
      },
    );

    expect((project.pages[0] as DraftPage).tts[0]?.synthesisSettings).toEqual({ volume: 0.8 });
  });
});

describe("settings hotkeys", () => {
  it("finds duplicate non-empty hotkeys", () => {
    expect([...findDuplicateHotkeys(["ctrl+s", "", "CTRL+S", "ctrl+1"])]).toEqual(["ctrl+s"]);
  });

  it("matches keyboard events against ctrl based hotkeys", () => {
    const event = {
      altKey: false,
      ctrlKey: true,
      key: "S",
      metaKey: false,
      shiftKey: true,
    } as KeyboardEvent;

    expect(eventMatchesHotkey(event, "ctrl+shift+s")).toBe(true);
    expect(eventMatchesHotkey(event, "ctrl+s")).toBe(false);
    expect(eventMatchesHotkey(event, "mod+shift+s")).toBe(false);
  });

  it("treats ctrl hotkeys as primary modifier so meta also matches", () => {
    const event = {
      altKey: false,
      ctrlKey: false,
      key: "Enter",
      metaKey: true,
      shiftKey: false,
    } as KeyboardEvent;

    expect(eventMatchesHotkey(event, "ctrl+enter")).toBe(true);
    expect(eventMatchesHotkey(event, "meta+enter")).toBe(true);
  });

  it("aliases delete and backspace for delete hotkeys", () => {
    const event = {
      altKey: false,
      ctrlKey: true,
      key: "Backspace",
      metaKey: false,
      shiftKey: true,
    } as KeyboardEvent;

    expect(eventMatchesHotkey(event, "ctrl+shift+delete")).toBe(true);
  });

  it("matches keyboard events with recorded meta and alt modifiers", () => {
    const event = {
      altKey: true,
      ctrlKey: false,
      key: "1",
      metaKey: true,
      shiftKey: false,
    } as KeyboardEvent;

    expect(eventMatchesHotkey(event, "alt+meta+1")).toBe(true);
    expect(eventMatchesHotkey(event, "meta+1")).toBe(false);
  });
});
