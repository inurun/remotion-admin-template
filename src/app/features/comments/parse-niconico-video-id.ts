const VIDEO_ID_PATTERN = /^(sm|nm|so)\d+$/i;

export function parseNiconicoVideoId(source: string): string {
  const trimmed = source.trim();
  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Niconico video id not found");
  }

  if (url.username || url.password) {
    throw new Error("Niconico video id not found");
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
    throw new Error("Niconico video id not found");
  }

  return videoId.toLowerCase();
}

export function tryParseNiconicoVideoId(source: string): string | null {
  try {
    return parseNiconicoVideoId(source);
  } catch {
    return null;
  }
}
