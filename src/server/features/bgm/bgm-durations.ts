import fs from "node:fs/promises";
import path from "node:path";
import { ALL_FORMATS, FilePathSource, Input } from "mediabunny";
import type { BgmTrack } from "@/_schemas";
import type { BgmDurations } from "@/server/features/project/to-timeline";

type CachedDuration = { mtimeMs: number; size: number; durationSec: number };

const cache = new Map<string, CachedDuration>();

async function measure(filePath: string): Promise<number> {
  const input = new Input({ formats: ALL_FORMATS, source: new FilePathSource(filePath) });
  try {
    return await input.computeDuration();
  } finally {
    input.dispose();
  }
}

async function measureCached(filePath: string): Promise<number | undefined> {
  try {
    const { mtimeMs, size } = await fs.stat(filePath);
    const cached = cache.get(filePath);
    if (cached && cached.mtimeMs === mtimeMs && cached.size === size) {
      return cached.durationSec;
    }
    const durationSec = await measure(filePath);
    cache.set(filePath, { mtimeMs, size, durationSec });
    return durationSec;
  } catch {
    // Missing or unreadable: `toTimeline` plays it once over the track span.
    return undefined;
  }
}

/** Length of each BGM file the tracks use, keyed by `BgmTrack.src`. */
export async function measureBgmDurations(
  tracks: BgmTrack[],
  musicsDir: string,
): Promise<BgmDurations> {
  const srcs = [...new Set(tracks.map((track) => track.src))];
  const entries = await Promise.all(
    srcs.map(
      async (src) => [src, await measureCached(path.join(musicsDir, path.basename(src)))] as const,
    ),
  );
  return Object.fromEntries(
    entries.filter((entry): entry is readonly [string, number] => entry[1] !== undefined),
  );
}
