import { describe, expect, it, vi } from "vitest";
import { listOptionalVoisonaVoices } from "../voices";
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
