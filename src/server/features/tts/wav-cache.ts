import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getProjectTtsDir, toProjectTtsSrc } from "@/server/_shared/storage";
import { stableStringify } from "@/server/_shared/stable-stringify";
import { getWavDurationSeconds } from "@/server/features/tts/wav";
import type { SynthesizeResponse } from "@/server/features/tts/contract";

const inFlightSyntheses = new Map<string, Promise<SynthesizeResponse>>();

export type PlannedWav = {
  fileName: string;
  outputPath: string;
  audioSrc: string;
};

function createTtsCacheKey(value: unknown) {
  return crypto.createHash("md5").update(stableStringify(value)).digest("hex");
}

export function planWav(input: { projectPath: string; cacheKey: unknown }): PlannedWav {
  const fileName = `${createTtsCacheKey(input.cacheKey)}.wav`;
  const outputPath = path.join(getProjectTtsDir(input.projectPath), fileName);
  const audioSrc = toProjectTtsSrc(input.projectPath, fileName);
  return { fileName, outputPath, audioSrc };
}

export async function readCachedWav(wav: PlannedWav): Promise<SynthesizeResponse | null> {
  try {
    await fs.access(wav.outputPath);
    return {
      outputPath: wav.outputPath,
      audioSrc: wav.audioSrc,
      durationSec: await getWavDurationSeconds(wav.outputPath),
    } satisfies SynthesizeResponse;
  } catch {
    return null;
  }
}

export async function synthesizeWithWavCache(input: {
  wav: PlannedWav;
  writeWav: (outputPath: string) => Promise<void>;
}): Promise<SynthesizeResponse> {
  const existing = inFlightSyntheses.get(input.wav.outputPath);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    await fs.mkdir(path.dirname(input.wav.outputPath), { recursive: true });
    const cached = await readCachedWav(input.wav);
    if (cached) {
      return cached;
    }

    await input.writeWav(input.wav.outputPath);
    return {
      outputPath: input.wav.outputPath,
      audioSrc: input.wav.audioSrc,
      durationSec: await getWavDurationSeconds(input.wav.outputPath),
    } satisfies SynthesizeResponse;
  })();

  inFlightSyntheses.set(input.wav.outputPath, task);

  try {
    return await task;
  } finally {
    if (inFlightSyntheses.get(input.wav.outputPath) === task) {
      inFlightSyntheses.delete(input.wav.outputPath);
    }
  }
}
