import { describe, expect, it } from "vitest";
import type { VoiceOption } from "@/_schemas";
import { eventMatchesHotkey, findDuplicateHotkeys } from "@/app/features/settings/lib/hotkeys";
import {
  getDefaultVoice,
  getVisibleVoiceOptions,
  mergeCatalogVoices,
  mergeVoiceOrder,
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

  it("remaps selected ids onto versioned catalog voices and keeps missing stubs", () => {
    const selected = {
      provider: "voicevox" as const,
      voiceName: "3",
      displayName: "ずんだもん / ノーマル",
    };
    const stub = voice("b", "B");
    const next = mergeCatalogVoices({
      catalog: [{ ...selected, voiceVersion: "0.15.0" }, voice("c", "C")],
      selectedVoices: [selected, stub],
      voiceOrder: ["voicevox::3::", "voisona::b::"],
      voiceSettings: {
        "voicevox::3::": { label: "🫛 ずんだ", alias: "zunda", hotkey: "ctrl+1" },
        "voisona::b::": { label: "B", alias: "b", hotkey: "ctrl+2" },
      },
    });

    expect(next.voiceOrder).toEqual(["voicevox::3::0.15.0", "voisona::b::"]);
    expect(next.voices.map((item) => item.voiceName)).toEqual(["3", "c", "b"]);
    expect(next.voiceSettings["voicevox::3::0.15.0"]?.alias).toBe("zunda");
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
