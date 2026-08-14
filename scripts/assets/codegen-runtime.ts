import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { ViteDevServer } from "vite";

const execFileAsync = promisify(execFile);

const publicDir = resolve(process.cwd(), "public");
const assetCodegenScript = resolve(process.cwd(), "scripts/assets/generate.ts");
const assetWatcherEvents = ["add", "change", "unlink"] as const;
const ignoredPublicDirs = [`${publicDir}/uploads`, `${publicDir}/tts`];

const isIgnoredPublicAsset = (file: string) =>
  ignoredPublicDirs.some((dir) => file === dir || file.startsWith(`${dir}/`));

const runAssetCodegen = async () => {
  await execFileAsync("node", [assetCodegenScript], {
    cwd: process.cwd(),
  });
};

export const createAssetGenerator = () => {
  let generation: Promise<void> | null = null;

  return async () => {
    if (generation) {
      return generation;
    }

    generation = runAssetCodegen().finally(() => {
      generation = null;
    });

    return generation;
  };
};

const reportAssetCodegenError = (server: ViteDevServer, error: unknown) => {
  server.config.logger.error(
    error instanceof Error ? error.message : "Failed to regenerate asset types.",
  );
};

export const registerAssetCodegenWatchers = (
  server: ViteDevServer,
  generate: () => Promise<void>,
) => {
  const onAssetChange = async (file: string) => {
    if (!file.startsWith(`${publicDir}/`) || isIgnoredPublicAsset(file)) {
      return;
    }

    try {
      await generate();
      server.ws.send({ type: "full-reload" });
    } catch (error) {
      reportAssetCodegenError(server, error);
    }
  };

  for (const event of assetWatcherEvents) {
    server.watcher.on(event, onAssetChange);
  }
};
