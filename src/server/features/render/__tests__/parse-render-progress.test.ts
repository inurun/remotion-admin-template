import { describe, expect, it } from "vitest";
import { parseRenderProgress, stripAnsi } from "../parse-render-progress";

describe("stripAnsi", () => {
  it("removes ANSI color codes", () => {
    expect(stripAnsi("\u001B[32m42%\u001B[0m")).toBe("42%");
  });
});

describe("parseRenderProgress", () => {
  it("reads the percent of a hyperframes progress bar", () => {
    expect(parseRenderProgress("  ██████████░░░░░░░░░░░░░░░  42%  Capturing frame 120/300")).toBe(
      42,
    );
    expect(parseRenderProgress("  ░░░░░░░░░░░░░░░░░░░░░░░░░  0%  Preparing")).toBe(0);
    expect(parseRenderProgress("  █████████████████████████  100%  Done")).toBe(100);
  });

  it("ignores ANSI colors around the bar", () => {
    expect(
      parseRenderProgress(
        "  \u001B[32m████\u001B[39m\u001B[2m░░░░\u001B[22m  \u001B[1m57%\u001B[22m  \u001B[2mEncoding\u001B[22m",
      ),
    ).toBe(57);
  });

  it("returns null for lines without a progress bar", () => {
    expect(parseRenderProgress("")).toBeNull();
    expect(parseRenderProgress("Discovering media assets from browser DOM...")).toBeNull();
    expect(parseRenderProgress("Downloading Chrome... 42% (1 MB / 2 MB)")).toBeNull();
  });
});
