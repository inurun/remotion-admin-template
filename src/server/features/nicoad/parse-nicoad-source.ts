import type { NicoadHistoryItem } from "./contract";

const VIDEO_ID_PATTERN = /(?:sm|nm|so|ss)\d+/i;

export class NicoadSourceError extends Error {}

export function parseNicoadVideoId(source: string): string {
  const match = source.trim().match(VIDEO_ID_PATTERN);
  const videoId = match?.[0];
  if (!videoId) {
    throw new NicoadSourceError("Niconico video id not found");
  }

  return videoId.toLowerCase();
}

export function uniqueNicoadAdvertisers(
  sponsors: readonly NicoadHistoryItem[],
): Array<{ name: string; message: string }> {
  const seen = new Set<string>();
  const advertisers: Array<{ name: string; message: string }> = [];

  for (const item of sponsors) {
    const key = item.userId == null ? `name:${item.advertiserName}` : `id:${item.userId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    advertisers.push({
      name: item.advertiserName,
      message: item.message ?? "",
    });
  }

  return advertisers;
}
