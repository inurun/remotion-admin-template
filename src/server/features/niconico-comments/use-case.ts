import { nowIso } from "@/_shared/lib/date/date";
import { niconicoCommentSchema, type NiconicoComment } from "@/_schemas/project/comments";
import {
  niconicoCommentsResponseSchema,
  nvCommentThreadsResponseSchema,
  type NiconicoCommentsResponse,
} from "./contract";
import {
  NiconicoCommentsError,
  niconicoWatchUrl,
  nvCommentThreadsUrl,
  parseNiconicoVideoId,
  parseWatchNvComment,
} from "./parse-watch-data";

const FETCH_TIMEOUT_MS = 10_000;
const HTML_MAX_BYTES = 2 * 1024 * 1024;
const JSON_MAX_BYTES = 10 * 1024 * 1024;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_LIMIT = 20;
const FETCH_HEADERS = {
  Accept: "*/*",
  "User-Agent": "Mozilla/5.0",
};

type CacheEntry = {
  expiresAt: number;
  value: NiconicoCommentsResponse;
};

const successCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<NiconicoCommentsResponse>>();

export function resetNiconicoCommentsCacheForTests() {
  successCache.clear();
  inflight.clear();
}

function pruneCache(now: number) {
  for (const [videoId, entry] of successCache) {
    if (entry.expiresAt <= now) {
      successCache.delete(videoId);
    }
  }
  while (successCache.size >= CACHE_LIMIT) {
    const oldest = successCache.keys().next().value;
    if (!oldest) {
      break;
    }
    successCache.delete(oldest);
  }
}

async function readLimitedText(response: Response, maxBytes: number) {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new NiconicoCommentsError("Response too large");
  }

  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new NiconicoCommentsError("Response too large");
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new NiconicoCommentsError("Response too large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function fetchWithLimits(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  maxBytes: number,
) {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof NiconicoCommentsError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new NiconicoCommentsError("Niconico request timed out");
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new NiconicoCommentsError("Niconico request timed out");
    }
    throw new NiconicoCommentsError("This video cannot be watched without a redirect or login");
  }

  if (response.status === 429) {
    throw new NiconicoCommentsError("Rate limited. Wait and fetch again.", 429);
  }

  if (!response.ok) {
    throw new NiconicoCommentsError(`Failed to fetch niconico comments (${response.status})`);
  }

  return readLimitedText(response, maxBytes);
}

function toPostedAt(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new NiconicoCommentsError("Comment postedAt has an unexpected format");
  }
  try {
    return niconicoCommentSchema.shape.postedAt.parse(value);
  } catch {
    return new Date(parsed).toISOString();
  }
}

function toMainComments(videoId: string, payload: unknown) {
  const parsed = nvCommentThreadsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new NiconicoCommentsError("Comment API response has an unexpected format");
  }
  if (parsed.data.meta.status !== 200) {
    throw new NiconicoCommentsError(
      `Failed to fetch niconico comments (${parsed.data.meta.status})`,
    );
  }

  const comments: NiconicoComment[] = [];
  const seen = new Set<string>();

  for (const thread of parsed.data.data.threads) {
    if (thread.fork !== "main") {
      continue;
    }

    for (const comment of thread.comments) {
      if (!comment.body.trim() || comment.no < 0 || comment.vposMs < 0) {
        continue;
      }
      const id = `${videoId}:${thread.id}:main:${comment.no}`;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      comments.push({
        id,
        threadId: thread.id,
        fork: "main",
        no: comment.no,
        body: comment.body,
        vposMs: comment.vposMs,
        postedAt: toPostedAt(comment.postedAt),
        hidden: false,
      });
    }
  }

  comments.sort((left, right) => {
    if (left.vposMs !== right.vposMs) {
      return left.vposMs - right.vposMs;
    }
    if (left.postedAt !== right.postedAt) {
      return left.postedAt < right.postedAt ? -1 : 1;
    }
    if (left.threadId !== right.threadId) {
      return left.threadId < right.threadId ? -1 : 1;
    }
    return left.no - right.no;
  });

  return comments;
}

async function loadNiconicoComments(videoId: string, fetcher: typeof fetch) {
  const html = await fetchWithLimits(
    fetcher,
    niconicoWatchUrl(videoId),
    { headers: FETCH_HEADERS },
    HTML_MAX_BYTES,
  );
  const nvComment = parseWatchNvComment(html);
  const jsonText = await fetchWithLimits(
    fetcher,
    nvCommentThreadsUrl(nvComment.server),
    {
      method: "POST",
      headers: {
        ...FETCH_HEADERS,
        "X-Frontend-Id": "6",
        "X-Frontend-Version": "0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        params: nvComment.params,
        additionals: {},
        threadKey: nvComment.threadKey,
      }),
    },
    JSON_MAX_BYTES,
  );

  let payload: unknown;
  try {
    payload = JSON.parse(jsonText);
  } catch {
    throw new NiconicoCommentsError("Comment API response is not valid JSON");
  }

  return niconicoCommentsResponseSchema.parse({
    videoId,
    fetchedAt: nowIso(),
    comments: toMainComments(videoId, payload),
  });
}

export async function fetchNiconicoComments(
  source: string,
  fetcher: typeof fetch = fetch,
): Promise<NiconicoCommentsResponse> {
  const videoId = parseNiconicoVideoId(source);
  const now = Date.now();
  pruneCache(now);
  const cached = successCache.get(videoId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const pending = inflight.get(videoId);
  if (pending) {
    return pending;
  }

  const request = loadNiconicoComments(videoId, fetcher)
    .then((value) => {
      pruneCache(Date.now());
      successCache.set(videoId, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value,
      });
      return value;
    })
    .finally(() => {
      inflight.delete(videoId);
    });
  inflight.set(videoId, request);
  return request;
}
