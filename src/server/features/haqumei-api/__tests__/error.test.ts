import { describe, expect, it } from "vitest";
import { HaqumeiApiError, parseHaqumeiProblemDetails } from "../error";

describe("HaqumeiApiError", () => {
  it("keeps status code and field paths", () => {
    const error = HaqumeiApiError.fromUnknown(
      {
        type: "about:blank",
        title: "Unrepresentable prosody",
        status: 422,
        code: "unrepresentable_prosody",
        detail: "pitch cannot be represented",
        errors: [{ path: "item.segments.0.words.0.moras.1.pitch", reason: "unrepresentable" }],
      },
      500,
    );

    expect(error).toMatchObject({
      status: 422,
      code: "unrepresentable_prosody",
    });
    expect(error.message).toContain("item.segments.0.words.0.moras.1.pitch");
    expect(error.errors).toEqual([
      { path: "item.segments.0.words.0.moras.1.pitch", reason: "unrepresentable" },
    ]);
  });

  it("does not invent a problem body when the payload is not ProblemDetails", () => {
    expect(parseHaqumeiProblemDetails("nope", 502)).toMatchObject({
      status: 502,
      code: "engine_failed",
    });
  });
});
