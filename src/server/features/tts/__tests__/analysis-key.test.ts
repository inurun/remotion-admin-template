import { describe, expect, it } from "vitest";
import { createTtsAnalysisKey } from "../analysis-key";
import { AUTOMATIC_LLM_G2P_PROFILE } from "../llm-g2p-profile";

const base = {
  projectPath: "project",
  pageId: "page-1",
  ttsId: "tts-1",
  provider: "voisona",
  text: "人気",
  effectiveReadText: "人気",
  baselineKana: "ニンキ'",
};

describe("createTtsAnalysisKey", () => {
  it("is stable for the same input", () => {
    expect(createTtsAnalysisKey(base)).toBe(createTtsAnalysisKey(base));
  });

  it("changes when text, readText, baseline, provider, or profile identity changes", () => {
    const original = createTtsAnalysisKey(base);
    expect(createTtsAnalysisKey({ ...base, text: "人気です" })).not.toBe(original);
    expect(createTtsAnalysisKey({ ...base, effectiveReadText: "にんき" })).not.toBe(original);
    expect(createTtsAnalysisKey({ ...base, baselineKana: "ヒトケ'" })).not.toBe(original);
    expect(createTtsAnalysisKey({ ...base, provider: "voicevox" })).not.toBe(original);
    expect(original).toMatch(/^[a-f0-9]{32}$/);
    expect(AUTOMATIC_LLM_G2P_PROFILE.id).toBe("gemma-4-31b-coreweave-fp4-v1");
  });
});
