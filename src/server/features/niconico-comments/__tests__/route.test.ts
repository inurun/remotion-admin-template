import { afterEach, describe, expect, it, vi } from "vitest";
import { niconicoCommentsApp } from "../route";
import { parseNiconicoVideoId, NiconicoCommentsError } from "../parse-watch-data";
import { resetNiconicoCommentsCacheForTests } from "../use-case";

const NV_COMMENT = {
  server: "https://public.nvcomment.nicovideo.jp",
  threadKey: "secret-thread-key",
  params: {
    language: "ja-jp",
    targets: [
      { id: "1789483093", fork: "owner" },
      { id: "1789483093", fork: "main" },
      { id: "1789483093", fork: "easy" },
    ],
  },
};

function watchHtml(nvComment: unknown = NV_COMMENT) {
  const payload = { data: { response: { comment: { nvComment } } } };
  const content = JSON.stringify(payload).replaceAll('"', "&quot;");
  return `<html><head><meta name="server-response" content="${content}"></head></html>`;
}

function threadsPayload(
  comments: Array<{
    no: number;
    body: string;
    vposMs: number;
    postedAt: string;
  }>,
) {
  return {
    meta: { status: 200 },
    data: {
      threads: [
        { id: "1789483093", fork: "owner", comments: [] },
        { id: "1789483093", fork: "main", comments },
        { id: "1789483093", fork: "easy", comments: [] },
      ],
    },
  };
}

function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("parseNiconicoVideoId", () => {
  it("accepts sm/nm/so ids and watch urls", () => {
    expect(parseNiconicoVideoId("SM46805363")).toBe("sm46805363");
    expect(parseNiconicoVideoId(" https://www.nicovideo.jp/watch/sm9?from=1#hash ")).toBe("sm9");
    expect(parseNiconicoVideoId("https://nicovideo.jp/watch/nm1")).toBe("nm1");
    expect(parseNiconicoVideoId("https://nico.ms/so2")).toBe("so2");
  });

  it("rejects numeric ids and ids inside unrelated urls", () => {
    expect(() => parseNiconicoVideoId("46805363")).toThrow(NiconicoCommentsError);
    expect(() => parseNiconicoVideoId("https://example.com/?q=sm123")).toThrow(
      NiconicoCommentsError,
    );
  });
});

describe("niconico comments routes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetNiconicoCommentsCacheForTests();
  });

  it("fetches main comments and hides connection secrets", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(watchHtml(), { status: 200 }))
      .mockResolvedValueOnce(
        jsonResponse(
          threadsPayload([
            {
              no: 7,
              body: "うぽつ",
              vposMs: 2000,
              postedAt: "2026-09-16T00:00:02.000Z",
            },
            {
              no: 1,
              body: "うぽつ",
              vposMs: 1000,
              postedAt: "2026-09-16T00:00:01.000Z",
            },
            {
              no: 2,
              body: "  ",
              vposMs: 1500,
              postedAt: "2026-09-16T00:00:01.500Z",
            },
          ]),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await niconicoCommentsApp.request("/niconico-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "https://www.nicovideo.jp/watch/sm46805363?from=1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      videoId: "sm46805363",
      fetchedAt: expect.stringMatching(/^\d{4}-/),
      comments: [
        {
          id: "sm46805363:1789483093:main:1",
          threadId: "1789483093",
          fork: "main",
          no: 1,
          body: "うぽつ",
          vposMs: 1000,
          postedAt: "2026-09-16T00:00:01.000Z",
        },
        {
          id: "sm46805363:1789483093:main:7",
          threadId: "1789483093",
          fork: "main",
          no: 7,
          body: "うぽつ",
          vposMs: 2000,
          postedAt: "2026-09-16T00:00:02.000Z",
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("secret-thread-key");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://www.nicovideo.jp/watch/sm46805363");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: "error" });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://public.nvcomment.nicovideo.jp/v1/threads");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      params: NV_COMMENT.params,
      additionals: {},
      threadKey: "secret-thread-key",
    });
  });

  it("returns success for zero main comments", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(watchHtml(), { status: 200 }))
        .mockResolvedValueOnce(jsonResponse(threadsPayload([]))),
    );

    const response = await niconicoCommentsApp.request("/niconico-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "sm1" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ videoId: "sm1", comments: [] });
  });

  it("rejects an unexpected watch payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response("<html></html>", { status: 200 })),
    );
    const response = await niconicoCommentsApp.request("/niconico-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "sm1" }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Watch page is missing comment connection data",
    });
  });

  it("rejects an unapproved comment server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(watchHtml({ ...NV_COMMENT, server: "https://evil.example" }), {
          status: 200,
        }),
      ),
    );
    const response = await niconicoCommentsApp.request("/niconico-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "sm1" }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unsupported comment server" });
  });

  it("asks the user to wait on 429", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("", { status: 429 })));
    const response = await niconicoCommentsApp.request("/niconico-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "sm1" }),
    });
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "Rate limited. Wait and fetch again." });
  });

  it("rejects oversized HTML before parsing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response("tiny", {
          status: 200,
          headers: { "Content-Length": String(3 * 1024 * 1024) },
        }),
      ),
    );
    const response = await niconicoCommentsApp.request("/niconico-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "sm1" }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Response too large" });
  });

  it("reuses a successful fetch for the same video", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(watchHtml(), { status: 200 }))
      .mockResolvedValueOnce(jsonResponse(threadsPayload([])));
    vi.stubGlobal("fetch", fetchMock);

    const first = await niconicoCommentsApp.request("/niconico-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "sm1" }),
    });
    const second = await niconicoCommentsApp.request("/niconico-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "https://nico.ms/sm1" }),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await first.json()).fetchedAt).toBe((await second.json()).fetchedAt);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent fetches for the same video", async () => {
    let resolveHtml!: (value: Response) => void;
    const htmlGate = new Promise<Response>((resolve) => {
      resolveHtml = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => htmlGate)
      .mockResolvedValueOnce(jsonResponse(threadsPayload([])));
    vi.stubGlobal("fetch", fetchMock);

    const first = niconicoCommentsApp.request("/niconico-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "sm1" }),
    });
    const second = niconicoCommentsApp.request("/niconico-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "sm1" }),
    });
    resolveHtml(new Response(watchHtml(), { status: 200 }));
    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(new Response(watchHtml(), { status: 200 }))
      .mockResolvedValueOnce(jsonResponse(threadsPayload([])));
    vi.stubGlobal("fetch", fetchMock);

    const failed = await niconicoCommentsApp.request("/niconico-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "sm1" }),
    });
    const retry = await niconicoCommentsApp.request("/niconico-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "sm1" }),
    });
    expect(failed.status).toBe(400);
    expect(retry.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
