import { describe, expect, it } from "vitest";
import { recordedKeysToHotkey } from "@/_shared/components/ui/hotkey-input.lib";

describe("recordedKeysToHotkey", () => {
  it("orders modifiers before the recorded key", () => {
    expect(recordedKeysToHotkey(new Set(["s", "shift", "ctrl"]))).toBe("ctrl+shift+s");
  });

  it("keeps alt and meta in a stable order", () => {
    expect(recordedKeysToHotkey(new Set(["1", "meta", "alt"]))).toBe("alt+meta+1");
  });

  it("ignores modifier-only and empty recordings", () => {
    expect(recordedKeysToHotkey(new Set())).toBeNull();
    expect(recordedKeysToHotkey(new Set(["ctrl", "shift"]))).toBeNull();
  });
});
