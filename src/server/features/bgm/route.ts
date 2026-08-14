import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { ensureProjectDirs, MUSICS_DIR } from "@/server/_shared/storage";
import { jsonError } from "@/server/_shared/http";

const SUPPORTED_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".aac", ".flac"]);

async function listMusicFiles(): Promise<string[]> {
  await ensureProjectDirs();
  const entries = await fs.readdir(MUSICS_DIR, { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isFile() && SUPPORTED_AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
    )
    .map((entry) => entry.name)
    .sort();
}

export const bgmApp = new Hono().get("/bgm", async (c) => {
  try {
    const files = await listMusicFiles();
    return c.json({ files });
  } catch (error) {
    return jsonError(c, 500, error, "Failed to list music files");
  }
});
