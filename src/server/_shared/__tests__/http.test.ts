import { describe, expect, it, vi } from "vitest";
import { jsonError } from "@/server/_shared/http";
import { HaqumeiApiError } from "@/server/features/haqumei-api/error";

describe("jsonError", () => {
  it("logs nested fetch failure reasons", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const cause = Object.assign(new AggregateError([new Error("connect ECONNREFUSED ::1:50021")]), {
      code: "ECONNREFUSED",
    });
    const error = new Error(
      "Failed to load VOICEVOX voices (http://localhost:50021): fetch failed",
      {
        cause: Object.assign(new TypeError("fetch failed"), { cause }),
      },
    );

    const response = jsonError(
      {
        req: { method: "GET", path: "/api/voices" },
        json: (body: unknown, init: { status: number }) => ({ body, status: init.status }),
      } as never,
      500,
      error,
      "Failed to load voices",
    );

    expect(response).toEqual({
      body: {
        error: "Failed to load VOICEVOX voices (http://localhost:50021): fetch failed",
      },
      status: 500,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[api] GET /api/voices -> 500: Error: Failed to load VOICEVOX voices (http://localhost:50021): fetch failed <- TypeError: fetch failed <- AggregateError (ECONNREFUSED:",
      ),
    );

    errorSpy.mockRestore();
  });

  it("forwards haqumei-api status code, detail, and field errors", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new HaqumeiApiError({
      type: "about:blank",
      title: "Analysis failed",
      status: 500,
      code: "analysis_failed",
      detail: 'texts[37] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7',
      errors: [{ path: "texts[37]", reason: "mora_mismatch" }],
    });

    const response = jsonError(
      {
        req: { method: "POST", path: "/api/project/project" },
        json: (body: unknown, init: { status: number }) => ({ body, status: init.status }),
      } as never,
      500,
      error,
      "Failed to save project",
    );

    expect(response).toEqual({
      body: {
        error: 'texts[37] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7',
        code: "analysis_failed",
        detail: 'texts[37] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7',
        errors: [{ path: "texts[37]", reason: "mora_mismatch" }],
      },
      status: 500,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      '[api] POST /api/project/project -> 500 analysis_failed: texts[37] "対象テキスト": mora mismatch: split=8 pitch_nuclei=7 [texts[37]: mora_mismatch]',
    );

    errorSpy.mockRestore();
  });

  it("falls back safely for malformed haqumei-api errors", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = HaqumeiApiError.fromUnknown("nope", 502);

    const response = jsonError(
      {
        req: { method: "POST", path: "/api/tts/analyze" },
        json: (body: unknown, init: { status: number }) => ({ body, status: init.status }),
      } as never,
      500,
      error,
      "Analyze failed",
    );

    expect(response).toEqual({
      body: {
        error: "haqumei-api request failed (502)",
        code: "engine_failed",
        detail: "haqumei-api request failed (502)",
        errors: [],
      },
      status: 502,
    });

    errorSpy.mockRestore();
  });
});
