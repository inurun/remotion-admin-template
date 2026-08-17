import { describe, expect, it } from "vitest";
import {
  shouldResetPageScopedState,
  valueAfterPageChange,
} from "@/app/features/page/lib/page-scope";

describe("page scoped state", () => {
  it("clears selected TTS when the page changes", () => {
    expect(shouldResetPageScopedState("page-a", "page-b")).toBe(true);
    expect(valueAfterPageChange("page-a", "page-b", "tts-1", null)).toBeNull();
  });

  it("keeps selected TTS while the page stays the same", () => {
    expect(shouldResetPageScopedState("page-a", "page-a")).toBe(false);
    expect(valueAfterPageChange("page-a", "page-a", "tts-1", null)).toBe("tts-1");
  });

  it("clears pending text focus when entering or leaving a page", () => {
    expect(valueAfterPageChange("page-a", null, "tts-1", null)).toBeNull();
    expect(valueAfterPageChange(null, "page-b", "tts-1", null)).toBeNull();
  });
});
