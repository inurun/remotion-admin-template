import { describe, expect, it } from "vitest";
import {
  getTtsMoveState,
  resolveTtsIndexAfterInsert,
  resolveTtsIndexAfterRemove,
  resolveTtsIndexForPage,
} from "@/app/features/tts/lib/tts-selection";

describe("TTS selection", () => {
  it("selects the first TTS item when a page has TTS entries", () => {
    expect(resolveTtsIndexForPage(2)).toBe(0);
    expect(resolveTtsIndexForPage(0)).toBeNull();
  });

  it("resolves the selected TTS item after removing an item", () => {
    expect(resolveTtsIndexAfterRemove(1, 0)).toBeNull();
    expect(resolveTtsIndexAfterRemove(3, 0)).toBe(0);
    expect(resolveTtsIndexAfterRemove(3, 2)).toBe(1);
  });

  it("resolves the inserted TTS index after the focused item", () => {
    expect(resolveTtsIndexAfterInsert(0)).toBe(1);
    expect(resolveTtsIndexAfterInsert(2)).toBe(3);
  });

  it("keeps selection on the same TTS item after reordering", () => {
    const ttsIds = ["a", "b", "c", "d"];

    expect(getTtsMoveState(ttsIds, 2, 0, 3)?.nextSelectedTtsIndex).toBe(1);
    expect(getTtsMoveState(ttsIds, 1, 1, 3)?.nextSelectedTtsIndex).toBe(3);
    expect(getTtsMoveState(ttsIds, null, 1, 3)?.nextSelectedTtsIndex).toBeNull();
  });

  it("rejects invalid TTS moves", () => {
    expect(getTtsMoveState(["a", "b"], 0, 0, 0)).toBeNull();
    expect(getTtsMoveState(["a", "b"], 0, -1, 1)).toBeNull();
    expect(getTtsMoveState(["a", "b"], 0, 0, 2)).toBeNull();
  });
});
