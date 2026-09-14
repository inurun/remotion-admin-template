import { describe, expect, it } from "vitest";
import {
  formatHaqumeiApiLog,
  HaqumeiApiError,
  haqumeiReadableError,
  parseHaqumeiProblemDetails,
} from "../error";

const analysisFailed = {
  type: "about:blank",
  title: "Analysis failed",
  status: 500,
  code: "analysis_failed",
  detail: 'texts[37] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7',
  errors: [{ path: "texts[37]", reason: "mora_mismatch", message: "" }],
};

describe("HaqumeiApiError", () => {
  it("keeps the concrete detail and field errors", () => {
    const error = HaqumeiApiError.fromUnknown(analysisFailed, 500);

    expect(error).toMatchObject({
      status: 500,
      code: "analysis_failed",
      detail: analysisFailed.detail,
    });
    expect(error.errors).toEqual([{ path: "texts[37]", reason: "mora_mismatch", message: "" }]);
  });

  it("keeps the human-readable field message for repair", () => {
    const error = HaqumeiApiError.fromUnknown(
      {
        type: "about:blank",
        title: "Invalid G2P",
        status: 422,
        code: "invalid_g2p",
        detail: 'item.kana: missing accent marker (\') in "ハイ"',
        errors: [
          {
            path: "item.kana",
            reason: "invalid_accent_nucleus",
            message: 'missing accent marker (\') in "ハイ"',
          },
        ],
      },
      422,
    );

    expect(error.errors).toEqual([
      {
        path: "item.kana",
        reason: "invalid_accent_nucleus",
        message: 'missing accent marker (\') in "ハイ"',
      },
    ]);
    expect(haqumeiReadableError(error)).toBe('missing accent marker (\') in "ハイ"');
  });

  it("falls back to detail then path:reason when message is absent", () => {
    const error = HaqumeiApiError.fromUnknown(analysisFailed, 500);
    expect(haqumeiReadableError(error)).toBe(analysisFailed.detail);
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
        errors: [{ path: "item.kana", reason: "unrepresentable" }],
      },
      500,
    );

    expect(error.message).toBe("unrepresentable_prosody: item.kana: unrepresentable");
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
      detail: 'item "対象テキスト": item.kana is invalid',
      errors: [
        {
          path: "item.kana",
          reason: "invalid_kana_syntax",
          message: "",
        },
      ],
    });

    expect(formatHaqumeiApiLog(error)).toBe(
      '422 invalid_synthesis_input: item "対象テキスト": item.kana is invalid [item.kana: invalid_kana_syntax]',
    );
  });

  it("adds chunk offset and global texts index when annotated", () => {
    const error = new HaqumeiApiError({
      ...analysisFailed,
      detail: 'texts[1] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7',
      errors: [{ path: "texts[1]", reason: "mora_mismatch", message: "" }],
    }).withChunkOffset(256);

    expect(formatHaqumeiApiLog(error)).toBe(
      '500 analysis_failed: texts[1] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7 [texts[1]: mora_mismatch] chunkOffset=256 global=texts[257]',
    );
  });
});
