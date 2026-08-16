import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getProjectTtsDir, toProjectTtsSrc } from "@/server/_shared/storage";
import { stableStringify } from "@/server/_shared/stable-stringify";
import { getWavDurationSeconds } from "@/server/features/tts/wav";
import type { SynthesizeResponse } from "@/server/features/tts/contract";

const inFlightSyntheses = new Map<string, Promise<SynthesizeResponse>>();

async function getCachedSynthesisResult(outputPath: string, audioSrc: string) {
  try {
    await fs.access(outputPath);
    return {
      outputPath,
      audioSrc,
      durationSec: await getWavDurationSeconds(outputPath),
    } satisfies SynthesizeResponse;
  } catch {
    return null;
  }
}

function createTtsCacheKey(value: unknown) {
  return crypto.createHash("md5").update(stableStringify(value)).digest("hex");
}

export async function synthesizeWithWavCache(input: {
  cacheKey: unknown;
  projectPath: string;
  writeWav: (outputPath: string) => Promise<void>;
}): Promise<SynthesizeResponse> {
  const fileName = `${createTtsCacheKey(input.cacheKey)}.wav`;
  const outputPath = path.join(getProjectTtsDir(input.projectPath), fileName);
  const audioSrc = toProjectTtsSrc(input.projectPath, fileName);
  const existing = inFlightSyntheses.get(outputPath);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const cached = await getCachedSynthesisResult(outputPath, audioSrc);
    if (cached) {
      return cached;
    }

    await input.writeWav(outputPath);
    return {
      outputPath,
      audioSrc,
      durationSec: await getWavDurationSeconds(outputPath),
    } satisfies SynthesizeResponse;
  })();

  inFlightSyntheses.set(outputPath, task);

  try {
    return await task;
  } finally {
    if (inFlightSyntheses.get(outputPath) === task) {
      inFlightSyntheses.delete(outputPath);
    }
  }
}
