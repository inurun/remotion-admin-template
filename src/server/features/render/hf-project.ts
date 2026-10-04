import fs from "node:fs/promises";
import path from "node:path";
import type { SavedProject, SavedSchedules, SavedTimeline } from "@/_schemas";
import { VIDEO_FPS } from "@/constants";
import { HF_ENTRY } from "@/video-host/constants";
import { PROJECT_ROOT, PUBLIC_DIR } from "@/server/_shared/storage";
import { buildCompositionHtml } from "@/server/features/hf-preview/build-html";
import { assetsFromManifest } from "@/server/features/hf-preview/bundle-assets";

/** `vite build -c vite.hf.config.ts` output. */
export const HF_BUNDLE_DIR = path.join(PROJECT_ROOT, "dist/hf");
/** Where the bundle is linked inside a render project. */
const BUNDLE_LINK = "hf";

/** Builds the video bundle into `dist/hf` (~1–3 s); Vite is a dev dependency. */
export async function buildHfBundle() {
  const { build } = await import("vite");
  await build({ configFile: path.join(PROJECT_ROOT, "vite.hf.config.ts"), logLevel: "error" });
}

/** Prod ships `dist/hf` from `pnpm build`. Dev serves sources, so each render builds it. */
export async function ensureHfBundle() {
  if (import.meta.env.DEV) {
    await buildHfBundle();
  }
  return HF_BUNDLE_DIR;
}

export type PrepareHfRenderProjectInput = {
  /** Recreated from scratch. */
  dir: string;
  bundleDir: string;
  project: SavedProject;
  timeline: SavedTimeline;
  schedules: SavedSchedules;
};

/**
 * A file-based HF project for `hyperframes render` / `snapshot`: the render-mode composition
 * HTML, the bundle and the public dirs as symlinks. The CLI injects its own runtime.
 */
export async function prepareHfRenderProject(input: PrepareHfRenderProjectInput) {
  const { dir, bundleDir, project, timeline, schedules } = input;
  const manifest = JSON.parse(
    await fs.readFile(path.join(bundleDir, ".vite/manifest.json"), "utf8"),
  );
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  const publicNames = await fs.readdir(PUBLIC_DIR);
  await Promise.all([
    ...publicNames.map((name) => fs.symlink(path.join(PUBLIC_DIR, name), path.join(dir, name))),
    fs.symlink(bundleDir, path.join(dir, BUNDLE_LINK)),
    fs.writeFile(
      path.join(dir, "index.html"),
      buildCompositionHtml({
        project,
        timeline,
        schedules,
        fps: VIDEO_FPS,
        mode: "render",
        assets: assetsFromManifest(manifest, HF_ENTRY, `${BUNDLE_LINK}/`),
        baseHref: "./",
      }),
    ),
  ]);
  return dir;
}
