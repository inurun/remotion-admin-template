import { describe, expect, it } from "vitest";
import { planWav } from "../wav-cache";

describe("wav cache planning", () => {
  it("returns the same fileName, audioSrc, and outputPath for the same cache input", () => {
    const input = {
      projectPath: "nested/example",
      cacheKey: { provider: "voisona", text: "hello", voiceName: "voice" },
    };

    expect(planWav(input)).toEqual(planWav(input));
    expect(planWav(input).fileName).toMatch(/^[a-f0-9]{32}\.wav$/u);
    expect(planWav(input).audioSrc).toBe(`/tts/nested/example/${planWav(input).fileName}`);
    expect(planWav(input).outputPath).toContain(planWav(input).fileName);
  });

  it("changes src when provider, g2p, voice, or settings change", () => {
    const base = {
      projectPath: "project",
      cacheKey: {
        provider: "voicevox",
        g2p: { text: "hello", kana: "ハロ" },
        voiceName: "3",
        voiceVersion: "1",
        synthesisSettings: { speedScale: 1 },
      },
    };

    const original = planWav(base).audioSrc;
    expect(
      planWav({ ...base, cacheKey: { ...base.cacheKey, provider: "voisona" } }).audioSrc,
    ).not.toBe(original);
    expect(
      planWav({ ...base, cacheKey: { ...base.cacheKey, g2p: { text: "hello", kana: "ヘ'ロ" } } })
        .audioSrc,
    ).not.toBe(original);
    expect(planWav({ ...base, cacheKey: { ...base.cacheKey, voiceName: "8" } }).audioSrc).not.toBe(
      original,
    );
    expect(
      planWav({ ...base, cacheKey: { ...base.cacheKey, voiceVersion: "2" } }).audioSrc,
    ).not.toBe(original);
    expect(
      planWav({
        ...base,
        cacheKey: { ...base.cacheKey, synthesisSettings: { speedScale: 1.2 } },
      }).audioSrc,
    ).not.toBe(original);
  });

  it("changes src when coeiroink identity or settings change", () => {
    const base = {
      projectPath: "project",
      cacheKey: {
        provider: "coeiroink",
        g2p: { text: "hello", kana: "ハロ" },
        speakerUuid: "speaker-1",
        styleId: 0,
        modelVersion: "1",
        synthesisSettings: { speedScale: 1 },
      },
    };
    const original = planWav(base).audioSrc;
    expect(
      planWav({ ...base, cacheKey: { ...base.cacheKey, speakerUuid: "speaker-2" } }).audioSrc,
    ).not.toBe(original);
    expect(planWav({ ...base, cacheKey: { ...base.cacheKey, styleId: 1 } }).audioSrc).not.toBe(
      original,
    );
    expect(
      planWav({ ...base, cacheKey: { ...base.cacheKey, modelVersion: "2" } }).audioSrc,
    ).not.toBe(original);
    expect(
      planWav({
        ...base,
        cacheKey: { ...base.cacheKey, synthesisSettings: { speedScale: 1.2 } },
      }).audioSrc,
    ).not.toBe(original);
  });
});
