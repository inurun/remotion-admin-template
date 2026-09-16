import { describe, expect, it } from "vitest";
import { isSingleImageRichText } from "../rich-text";

describe("isSingleImageRichText", () => {
  it("detects a single image", () => {
    expect(isSingleImageRichText('<img src="/image.png" alt="image" />')).toBe(true);
  });

  it("ignores whitespace around a single image", () => {
    expect(isSingleImageRichText(' <p> </p> <img src="/image.png"> ')).toBe(false);
    expect(isSingleImageRichText(' \n<img src="/image.png">\n ')).toBe(true);
  });

  it("rejects an image with text content", () => {
    expect(isSingleImageRichText('<p>Hello</p><img src="/image.png">')).toBe(false);
  });

  it("rejects normal paragraphs", () => {
    expect(isSingleImageRichText("<p>Hello</p>")).toBe(false);
  });
});
