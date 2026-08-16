import { describe, expect, it } from "vitest";
import { getErrorMessage } from "../error-message";

describe("getErrorMessage", () => {
  it("returns Error.message instead of a fixed fallback", () => {
    expect(
      getErrorMessage(
        new Error('texts[37] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7'),
        "Save failed",
      ),
    ).toBe('texts[37] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7');
  });

  it("does not stringify Error to {}", () => {
    const error = new Error("analysis_failed");
    expect(JSON.stringify(error)).toBe("{}");
    expect(getErrorMessage(error)).toBe("analysis_failed");
  });

  it("uses the fallback for non-Error values", () => {
    expect(getErrorMessage("nope", "Save failed")).toBe("Save failed");
  });

  it("stringifies non-Error values when no fallback is given", () => {
    expect(getErrorMessage(404)).toBe("404");
  });
});
