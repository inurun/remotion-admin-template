import { describe, expect, it } from "vitest";
import { needsAutomaticLlmAnalyze } from "../automatic-llm-eligibility";

describe("needsAutomaticLlmAnalyze", () => {
  it.each(["うん？", "いぇーん", "はい！", " ", "　", "？!…"])(
    "skips kana or symbol only readText: %s",
    (readText) => {
      expect(needsAutomaticLlmAnalyze(readText)).toBe(false);
    },
  );

  it.each(["うん大丈夫？", "はい3", "Hello", ""])(
    "sends mixed or empty readText to LLM: %s",
    (readText) => {
      expect(needsAutomaticLlmAnalyze(readText)).toBe(true);
    },
  );
});
