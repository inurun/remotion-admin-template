import { describe, expect, it, vi } from "vitest";
import { listOptionalCoeiroinkVoices, listOptionalVoisonaVoices } from "../voices";
import { HaqumeiApiError } from "../error";

const { getHaqumeiApiClientMock } = vi.hoisted(() => ({
  getHaqumeiApiClientMock: vi.fn(),
}));

vi.mock("../client", () => ({
  getHaqumeiApiClient: getHaqumeiApiClientMock,
  unwrapHaqumeiData: (result: { data?: unknown; error?: unknown; response: Response }) => {
    if (result.response.ok && result.data !== undefined) {
      return result.data;
    }
    throw HaqumeiApiError.fromUnknown(result.error, result.response.status);
  },
}));

describe("listOptionalVoisonaVoices", () => {
  it("skips engine_not_configured", async () => {
    getHaqumeiApiClientMock.mockReturnValueOnce({
      GET: async () => ({
        response: new Response(null, { status: 503 }),
        error: {
          code: "engine_not_configured",
          status: 503,
          title: "Engine not configured",
          detail: "VoiSona credentials are not configured",
          type: "about:blank",
        },
      }),
    });

    await expect(listOptionalVoisonaVoices({})).resolves.toEqual([]);
  });
});

describe("listOptionalCoeiroinkVoices", () => {
  it("skips engine_failed and engine_timeout", async () => {
    getHaqumeiApiClientMock.mockReturnValueOnce({
      GET: async () => ({
        response: new Response(null, { status: 503 }),
        error: {
          code: "engine_failed",
          status: 503,
          title: "Engine failed",
          detail: "COEIROINK is not running",
          type: "about:blank",
        },
      }),
    });
    await expect(listOptionalCoeiroinkVoices({})).resolves.toEqual([]);

    getHaqumeiApiClientMock.mockReturnValueOnce({
      GET: async () => ({
        response: new Response(null, { status: 504 }),
        error: {
          code: "engine_timeout",
          status: 504,
          title: "Engine timeout",
          detail: "timed out",
          type: "about:blank",
        },
      }),
    });
    await expect(listOptionalCoeiroinkVoices({})).resolves.toEqual([]);
  });

  it("rethrows unknown error codes", async () => {
    getHaqumeiApiClientMock.mockReturnValueOnce({
      GET: async () => ({
        response: new Response(null, { status: 500 }),
        error: {
          code: "unexpected",
          status: 500,
          title: "boom",
          detail: "boom",
          type: "about:blank",
        },
      }),
    });
    await expect(listOptionalCoeiroinkVoices({})).rejects.toBeInstanceOf(HaqumeiApiError);
  });
});
