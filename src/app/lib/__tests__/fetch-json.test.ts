import { describe, expect, it } from "vitest";
import { parseApiJson } from "../fetch-json";

describe("parseApiJson", () => {
  it("throws the haqumei analysis_failed detail as Error.message", async () => {
    const detail = 'texts[37] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7';
    const response = new Response(
      JSON.stringify({
        error: detail,
        code: "analysis_failed",
        detail,
        errors: [{ path: "texts[37]", reason: "mora_mismatch" }],
      }),
      { status: 500 },
    );

    await expect(parseApiJson(response)).rejects.toThrow(detail);
  });
});
