import { describe, expect, it } from "vitest";
import { assertHaqumeiTextLength, assertHaqumeiValidateBatch, chunkAnalyzeTexts } from "../limits";

describe("haqumei-api limits", () => {
  it("counts unicode scalars rather than UTF-16 units", () => {
    expect(() => assertHaqumeiTextLength("𰻞".repeat(500))).not.toThrow();
    expect(() => assertHaqumeiTextLength("𰻞".repeat(501))).toThrow(/exceeds 500 characters/);
  });

  it("chunks by 256 items", () => {
    const texts = Array.from({ length: 257 }, (_, index) => `t${index}`);
    const chunks = chunkAnalyzeTexts(texts);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(256);
    expect(chunks[1]).toEqual(["t256"]);
  });

  it("chunks when total unicode scalars exceed 32000", () => {
    const longText = "あ".repeat(500);
    const texts = Array.from({ length: 65 }, () => longText);
    const chunks = chunkAnalyzeTexts(texts);
    expect(chunks[0]).toHaveLength(64);
    expect(chunks[1]).toEqual([longText]);
  });

  it("rejects a validate batch over the item limit", () => {
    const texts = Array.from({ length: 257 }, (_, index) => `t${index}`);
    expect(() => assertHaqumeiValidateBatch(texts)).toThrow(/exceeds 256 items/);
  });
});
