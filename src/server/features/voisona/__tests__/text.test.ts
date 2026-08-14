import { describe, expect, it } from "vitest";
import { applyVoisonaTextTransforms, getVoisonaReadText } from "../text";

describe("text helpers", () => {
  it("normalizes line breaks and trailing punctuation", () => {
    expect(applyVoisonaTextTransforms("  こんにちは。\r\n\r\n世界。。。  ")).toBe(
      "こんにちは。世界",
    );
  });

  it("prefers explicit read text when present", () => {
    expect(getVoisonaReadText("原文", " よみ \n テキスト。 ")).toBe("よみ。テキスト");
  });
});
