import { describe, expect, it } from "vitest";
import { parseRenderProgress, stripAnsi } from "../parse-render-progress";

describe("stripAnsi", () => {
  it("removes ANSI color codes", () => {
    expect(stripAnsi("\u001B[32mBundling 40%\u001B[0m")).toBe("Bundling 40%");
  });
});

describe("parseRenderProgress", () => {
  it("returns null for empty or unrelated lines", () => {
    expect(parseRenderProgress("")).toBeNull();
    expect(parseRenderProgress("   ")).toBeNull();
    expect(parseRenderProgress("Getting composition")).toBeNull();
  });

  it("maps bundling percent into 0-5", () => {
    expect(parseRenderProgress("Bundling 0%")).toBe(0);
    expect(parseRenderProgress("Bundling 50%")).toBe(3);
    expect(parseRenderProgress("Bundling 100%")).toBe(5);
    expect(parseRenderProgress("\u001B[32mBundling 100%\u001B[0m")).toBe(5);
  });

  it("maps rendered frames into 5-85", () => {
    expect(parseRenderProgress("Rendered 0/300")).toBe(5);
    expect(parseRenderProgress("Rendered 150/300")).toBe(45);
    expect(parseRenderProgress("Rendered 300/300")).toBe(85);
  });

  it("maps encoded frames into 85-100", () => {
    expect(parseRenderProgress("Encoded 0/300")).toBe(85);
    expect(parseRenderProgress("Encoded 150/300")).toBe(93);
    expect(parseRenderProgress("Encoded 300/300")).toBe(100);
  });

  it("uses a generic percent when no stage label matches", () => {
    expect(parseRenderProgress("42%")).toBe(42);
    expect(parseRenderProgress("Rendering 99.4%")).toBe(99);
  });
});
