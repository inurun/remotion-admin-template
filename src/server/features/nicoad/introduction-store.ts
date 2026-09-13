import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ADVERTISERS_PATH } from "@/server/_shared/storage";
import type { NicoadAdvertiser } from "./contract";

const introductionSchema = z.object({
  identityKey: z.string().min(1),
  userId: z.number().int().optional(),
  name: z.string(),
  introducedVideoIds: z.array(z.string().min(1)).default([]),
});

const introductionStoreSchema = z.object({
  advertisers: z.array(introductionSchema).default([]),
});

type IntroductionStore = z.infer<typeof introductionStoreSchema>;
type FetchedAdvertiser = Omit<NicoadAdvertiser, "introductionCount">;

function addVideoIntroduction(
  store: IntroductionStore,
  videoId: string,
  advertiser: FetchedAdvertiser,
) {
  const existing = store.advertisers.find((item) => item.identityKey === advertiser.identityKey);
  if (!existing) {
    store.advertisers.push({
      identityKey: advertiser.identityKey,
      userId: advertiser.userId,
      name: advertiser.name,
      introducedVideoIds: [videoId],
    });
    return 1;
  }

  existing.userId = advertiser.userId;
  existing.name = advertiser.name;
  if (!existing.introducedVideoIds.includes(videoId)) {
    existing.introducedVideoIds.push(videoId);
  }
  return existing.introducedVideoIds.length;
}

export function recordIntroductions(
  store: IntroductionStore,
  videoId: string,
  advertisers: readonly FetchedAdvertiser[],
) {
  const next = introductionStoreSchema.parse(store);
  const result = advertisers.map((advertiser) => ({
    ...advertiser,
    introductionCount: addVideoIntroduction(next, videoId, advertiser),
  }));
  return { store: next, advertisers: result };
}

async function readStore() {
  try {
    return introductionStoreSchema.parse(JSON.parse(await fs.readFile(ADVERTISERS_PATH, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return introductionStoreSchema.parse({});
    }
    throw error;
  }
}

async function writeStore(store: IntroductionStore) {
  await fs.mkdir(path.dirname(ADVERTISERS_PATH), { recursive: true });
  const tempPath = `${ADVERTISERS_PATH}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(tempPath, JSON.stringify(store, null, 2));
    await fs.rename(tempPath, ADVERTISERS_PATH);
  } catch (error) {
    try {
      await fs.rm(tempPath, { force: true });
    } catch {
      // Preserve the original write error.
    }
    throw error;
  }
}

let updateQueue = Promise.resolve();

export function persistIntroductions(videoId: string, advertisers: readonly FetchedAdvertiser[]) {
  const update = updateQueue.then(async () => {
    const result = recordIntroductions(await readStore(), videoId, advertisers);
    await writeStore(result.store);
    return result.advertisers;
  });
  updateQueue = update.then(
    () => undefined,
    () => undefined,
  );
  return update;
}
