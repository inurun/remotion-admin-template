import { load } from "cheerio";
import { watchServerResponseSchema, type NvComment } from "./contract";

const VIDEO_ID_PATTERN = /^(sm|nm|so)\d+$/i;

export class NiconicoCommentsError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function parseNiconicoVideoId(source: string): string {
  const trimmed = source.trim();
  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new NiconicoCommentsError("Niconico video id not found");
  }

  if (url.username || url.password) {
    throw new NiconicoCommentsError("Niconico video id not found");
  }

  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  const watchMatch =
    host === "www.nicovideo.jp" || host === "nicovideo.jp"
      ? path.match(/^\/watch\/((sm|nm|so)\d+)$/i)
      : host === "nico.ms"
        ? path.match(/^\/((sm|nm|so)\d+)$/i)
        : null;
  const videoId = watchMatch?.[1];
  if (!videoId) {
    throw new NiconicoCommentsError("Niconico video id not found");
  }

  return videoId.toLowerCase();
}

export function niconicoWatchUrl(videoId: string) {
  return `https://www.nicovideo.jp/watch/${videoId}`;
}

export function assertAllowedNvCommentServer(server: string) {
  let url: URL;
  try {
    url = new URL(server);
  } catch {
    throw new NiconicoCommentsError("Unsupported comment server");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port !== "" ||
    url.hostname !== "public.nvcomment.nicovideo.jp" ||
    (url.pathname !== "" && url.pathname !== "/") ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new NiconicoCommentsError("Unsupported comment server");
  }
}

export function parseWatchNvComment(html: string): NvComment {
  const content = load(html)('meta[name="server-response"]').attr("content");
  if (!content) {
    throw new NiconicoCommentsError("Watch page is missing comment connection data");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new NiconicoCommentsError("Watch page comment data is not valid JSON");
  }

  const result = watchServerResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new NiconicoCommentsError("Watch page comment data has an unexpected format");
  }

  const nvComment = result.data.data.response.comment.nvComment;
  assertAllowedNvCommentServer(nvComment.server);
  return nvComment;
}

export function nvCommentThreadsUrl(server: string) {
  assertAllowedNvCommentServer(server);
  return `${new URL(server).origin}/v1/threads`;
}
