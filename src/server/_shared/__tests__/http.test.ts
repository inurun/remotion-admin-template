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

  it("forwards haqumei-api status code and field paths", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new HaqumeiApiError({
      type: "about:blank",
      title: "Unrepresentable prosody",
      status: 422,
      code: "unrepresentable_prosody",
      detail: "pitch cannot be represented",
      errors: [{ path: "item.segments.0.words.0.moras.1.pitch", reason: "unrepresentable" }],
    });

    const response = jsonError(
      {
        req: { method: "POST", path: "/api/tts/synthesize" },
        json: (body: unknown, init: { status: number }) => ({ body, status: init.status }),
      } as never,
      500,
      error,
      "Synthesize failed",
    );

    expect(response).toEqual({
      body: {
        error: "unrepresentable_prosody: item.segments.0.words.0.moras.1.pitch",
        code: "unrepresentable_prosody",
        errors: [{ path: "item.segments.0.words.0.moras.1.pitch", reason: "unrepresentable" }],
      },
      status: 422,
    });

    errorSpy.mockRestore();
  });
});
