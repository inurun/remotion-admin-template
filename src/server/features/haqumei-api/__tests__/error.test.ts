import { describe, expect, it } from "vitest";
import { formatHaqumeiApiLog, HaqumeiApiError, parseHaqumeiProblemDetails } from "../error";

const analysisFailed = {
  type: "about:blank",
  title: "Analysis failed",
  status: 500,
  code: "analysis_failed",
  detail: 'texts[37] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7',
  errors: [{ path: "texts[37]", reason: "mora_mismatch" }],
};

describe("HaqumeiApiError", () => {
  it("keeps the concrete detail and field errors", () => {
    const error = HaqumeiApiError.fromUnknown(analysisFailed, 500);

    expect(error).toMatchObject({
      status: 500,
      code: "analysis_failed",
      detail: analysisFailed.detail,
    });
    expect(error.errors).toEqual([{ path: "texts[37]", reason: "mora_mismatch" }]);
  });

  it("prefers detail over field paths in the message", () => {
    const error = HaqumeiApiError.fromUnknown(analysisFailed, 500);

    expect(error.message).toBe(analysisFailed.detail);
  });

  it("falls back to code and path:reason when detail is empty", () => {
    const error = HaqumeiApiError.fromUnknown(
      {
        type: "about:blank",
        title: "Unrepresentable prosody",
        status: 422,
        code: "unrepresentable_prosody",
        detail: "",
        errors: [{ path: "item.segments.0.words.0.moras.1.pitch", reason: "unrepresentable" }],
      },
      500,
    );

    expect(error.message).toBe(
      "unrepresentable_prosody: item.segments.0.words.0.moras.1.pitch: unrepresentable",
    );
  });

  it("does not invent a problem body when the payload is not ProblemDetails", () => {
    expect(parseHaqumeiProblemDetails("nope", 502)).toMatchObject({
      status: 502,
      code: "engine_failed",
      detail: "haqumei-api request failed (502)",
      errors: [],
    });
  });
});

describe("formatHaqumeiApiLog", () => {
  it("includes status, code, detail, and path:reason", () => {
    const error = new HaqumeiApiError(analysisFailed);

    expect(formatHaqumeiApiLog(error)).toBe(
      '500 analysis_failed: texts[37] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7 [texts[37]: mora_mismatch]',
    );
  });

  it("keeps synthesis target text in the log", () => {
    const error = new HaqumeiApiError({
      type: "about:blank",
      title: "Invalid synthesis input",
      status: 422,
      code: "invalid_synthesis_input",
      detail: 'item "対象テキスト": item.segments[0].words[2].moras[0].text is invalid',
      errors: [
        {
          path: "item.segments[0].words[2].moras[0].text",
          reason: "invalid_mora",
        },
      ],
    });

    expect(formatHaqumeiApiLog(error)).toBe(
      '422 invalid_synthesis_input: item "対象テキスト": item.segments[0].words[2].moras[0].text is invalid [item.segments[0].words[2].moras[0].text: invalid_mora]',
    );
  });

  it("adds chunk offset and global texts index when annotated", () => {
    const error = new HaqumeiApiError({
      ...analysisFailed,
      detail: 'texts[1] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7',
      errors: [{ path: "texts[1]", reason: "mora_mismatch" }],
    }).withChunkOffset(256);

    expect(formatHaqumeiApiLog(error)).toBe(
      '500 analysis_failed: texts[1] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7 [texts[1]: mora_mismatch] chunkOffset=256 global=texts[257]',
    );
  });
});
