import { describe, expect, it } from "vitest";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { applyLlmG2pResults, createLlmG2pSnapshot } from "../llm-g2p-dialog.lib";

function tts(overrides: Partial<TtsFormValues> = {}): TtsFormValues {
  return {
    id: "tts-1",
    provider: "voisona",
    text: "人気",
    readText: "にんき",
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    synthesisSettings: null,
    ...overrides,
  } as TtsFormValues;
}

describe("LLM G2P page helpers", () => {
  it("applies only G2P and preserves source fields", () => {
    const source = tts({ speech: { g2p: createG2pItem("old") } });
    const nextG2p = createG2pItem("にんき");
    const [result] = applyLlmG2pResults(
      [source],
      [{ id: "tts-1", status: "corrected", g2p: nextG2p }],
    );

    expect(result).toMatchObject({
      id: "tts-1",
      text: "人気",
      readText: "にんき",
      speech: { g2p: nextG2p },
    });
  });

  it("detects source changes but ignores G2P changes", () => {
    const source = tts();
    const snapshot = createLlmG2pSnapshot("page-1", [source]);
    expect(
      createLlmG2pSnapshot("page-1", [{ ...source, speech: { g2p: createG2pItem("x") } }]),
    ).toBe(snapshot);
    expect(createLlmG2pSnapshot("page-1", [{ ...source, text: "変更" }])).not.toBe(snapshot);
  });
});
