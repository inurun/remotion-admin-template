import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_PROJECT_META, DEFAULT_VOICE_PRESETS, SEQUENCE_TRACK_ID } from "@/_schemas";
import { HF_ENTRY } from "@/video-host/constants";
import { PUBLIC_DIR } from "@/server/_shared/storage";
import { prepareHfRenderProject } from "../hf-project";

let tmp: string | null = null;

afterEach(async () => {
  if (tmp) {
    await fs.rm(tmp, { recursive: true, force: true });
    tmp = null;
  }
});

async function setup() {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "hf-project-"));
  const bundleDir = path.join(tmp, "bundle");
  await fs.mkdir(path.join(bundleDir, ".vite"), { recursive: true });
  await fs.writeFile(
    path.join(bundleDir, ".vite/manifest.json"),
    JSON.stringify({ [HF_ENTRY]: { file: "assets/entry.js", css: ["assets/entry.css"] } }),
  );
  return { bundleDir, dir: path.join(tmp, "project") };
}

const input = {
  project: { meta: DEFAULT_PROJECT_META, pages: [], bgm: [], voicePresets: DEFAULT_VOICE_PRESETS },
  timeline: { durationSec: 5, tracks: [{ id: SEQUENCE_TRACK_ID, clips: [] }] },
  schedules: { items: [] },
};

describe("prepareHfRenderProject", () => {
  it("writes the render-mode HTML with relative bundle links", async () => {
    const { bundleDir, dir } = await setup();
    await prepareHfRenderProject({ ...input, dir, bundleDir });

    const html = await fs.readFile(path.join(dir, "index.html"), "utf8");
    expect(html).toContain('data-mode="render"');
    expect(html).toContain('<base href="./" />');
    expect(html).toContain('<script type="module" src="hf/assets/entry.js"></script>');
    expect(html).toContain('<link rel="stylesheet" href="hf/assets/entry.css" />');
    expect(await fs.readlink(path.join(dir, "hf"))).toBe(bundleDir);
  });

  it("links every public entry", async () => {
    const { bundleDir, dir } = await setup();
    await prepareHfRenderProject({ ...input, dir, bundleDir });

    const [name] = await fs.readdir(PUBLIC_DIR);
    expect(name).toBeDefined();
    expect(await fs.readlink(path.join(dir, name!))).toBe(path.join(PUBLIC_DIR, name!));
  });

  it("replaces a previous project", async () => {
    const { bundleDir, dir } = await setup();
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "stale.txt"), "");
    await prepareHfRenderProject({ ...input, dir, bundleDir });

    await expect(fs.access(path.join(dir, "stale.txt"))).rejects.toThrow();
  });
});
