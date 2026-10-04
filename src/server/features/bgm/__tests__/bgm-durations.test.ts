import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { BgmTrack } from "@/_schemas";
import { measureBgmDurations } from "../bgm-durations";

/** Silent 16-bit mono PCM. */
function wav(durationSec: number, sampleRate = 8000) {
  const dataSize = Math.round(durationSec * sampleRate) * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

const track = (src: string): BgmTrack => ({
  src,
  startSec: null,
  endSec: null,
  fadeIn: false,
  fadeOut: false,
  volume: 1,
});

let dir = "";

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "bgm-durations-"));
  await fs.writeFile(path.join(dir, "a.wav"), wav(1.5));
  await fs.writeFile(path.join(dir, "b.wav"), wav(0.25));
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("measureBgmDurations", () => {
  it("measures each file the tracks use and skips missing ones", async () => {
    const durations = await measureBgmDurations(
      [track("a.wav"), track("a.wav"), track("b.wav"), track("missing.mp3")],
      dir,
    );

    expect(Object.keys(durations).sort()).toEqual(["a.wav", "b.wav"]);
    expect(durations["a.wav"]).toBeCloseTo(1.5, 6);
    expect(durations["b.wav"]).toBeCloseTo(0.25, 6);
  });

  it("re-measures a file replaced under the same name", async () => {
    const filePath = path.join(dir, "c.wav");
    await fs.writeFile(filePath, wav(1));
    expect((await measureBgmDurations([track("c.wav")], dir))["c.wav"]).toBeCloseTo(1, 6);

    await fs.writeFile(filePath, wav(2));
    expect((await measureBgmDurations([track("c.wav")], dir))["c.wav"]).toBeCloseTo(2, 6);
  });
});
