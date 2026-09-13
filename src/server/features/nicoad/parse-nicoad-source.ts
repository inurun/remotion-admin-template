import type { NicoadAdvertiser, NicoadHistoryItem } from "./contract";

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
): Array<Omit<NicoadAdvertiser, "introductionCount">> {
  const seen = new Set<string>();
  const advertisers: Array<Omit<NicoadAdvertiser, "introductionCount">> = [];

  for (const item of sponsors) {
    const name = item.advertiserName.trim();
    const identityKey = item.userId == null ? `name:${name}` : `user:${item.userId}`;
    if (seen.has(identityKey)) {
      continue;
    }

    seen.add(identityKey);
    advertisers.push({
      userId: item.userId,
      identityKey,
      name,
      message: item.message ?? "",
    });
  }

  return advertisers;
}
