import fs from "node:fs/promises";
import path from "node:path";
import { HF_BUNDLE_BASE, HF_ENTRY } from "@/video-host/constants";
import { PROJECT_ROOT } from "@/server/_shared/storage";
import type { HfBundleAssets } from "./build-html";

const MANIFEST_PATH = path.join(PROJECT_ROOT, "dist/hf/.vite/manifest.json");

type ManifestChunk = { file: string; css?: string[] };

export function assetsFromManifest(
  manifest: Record<string, ManifestChunk>,
  entry: string,
  base: string,
): HfBundleAssets {
  const chunk = manifest[entry];
  if (!chunk) {
    throw new Error(`HF bundle entry missing from manifest: ${entry}`);
  }
  return {
    scripts: [`${base}${chunk.file}`],
    styles: (chunk.css ?? []).map((file) => `${base}${file}`),
  };
}

/** Dev: the embedded Vite instance serves sources. Prod: the `dist/hf` build. */
export async function resolveBundleAssets(): Promise<HfBundleAssets> {
  if (import.meta.env.DEV) {
    return { scripts: [`${HF_BUNDLE_BASE}${HF_ENTRY}`], styles: [] };
  }
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  return assetsFromManifest(manifest, HF_ENTRY, HF_BUNDLE_BASE);
}
