import { afterEach, describe, expect, it, vi } from "vitest";
import { nicoadApp } from "../route";

describe("nicoad routes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unique advertisers from thanks", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        meta: { status: 200 },
        data: {
          sponsors: [
            { advertiserName: "Ada", message: "hello", userId: 1 },
            { advertiserName: "Ada", message: "again", userId: 1 },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await nicoadApp.request("/nicoad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "https://nicoad.nicovideo.jp/video/publish/sm46665240" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      videoId: "sm46665240",
      advertisers: [{ name: "Ada", message: "hello" }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.nicoad.nicovideo.jp/v1/contents/video/sm46665240/thanks?limit=1000",
      expect.objectContaining({ redirect: "follow" }),
    );
  });

  it("returns bad request when the source has no video id", async () => {
    const response = await nicoadApp.request("/nicoad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "https://example.com" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Niconico video id not found" });
  });
});
