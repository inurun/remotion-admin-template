import { describe, expect, it, vi } from "vitest";
import { jsonError } from "@/server/_shared/http";

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
});
