import fs from "node:fs/promises";
import path from "node:path";
import { SEQUENCE_TRACK_ID, savedProjectSchema } from "@/_schemas";
import { toTimeline } from "@/server/features/project/to-timeline";
import { PROJECT_ROOT } from "@/server/_shared/storage";

const DATA_DIR = path.join(PROJECT_ROOT, "data");
const EXCLUDE = new Set(["schedules.json", "publish-state.json", "advertisers.json"]);

async function listProjectFiles(dirPath: string, nestedPath = ""): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = nestedPath ? path.join(nestedPath, entry.name) : entry.name;
      const absolutePath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return listProjectFiles(absolutePath, relativePath);
      }
      if (
        !entry.isFile() ||
        !entry.name.endsWith(".json") ||
        entry.name.endsWith(".timeline.json") ||
        EXCLUDE.has(entry.name)
      ) {
        return [];
      }
      return [absolutePath];
    }),
  );
  return files.flat();
}

async function migrateFile(filePath: string) {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as {
    pages?: Array<{ id?: string; durationSec?: number; type?: string }>;
    voicePresets?: unknown;
  };
  const previousItems = (raw.pages ?? []).flatMap((page) => {
    if (!page?.id || typeof page.durationSec !== "number" || page.type === "transition") {
      return [];
    }
    return [
      {
        id: page.id,
        startSec: 0,
        durationSec: page.durationSec,
        clips: [],
      },
    ];
  });
  const project = savedProjectSchema.parse({
    ...raw,
    voicePresets: Array.isArray(raw.voicePresets)
      ? Object.fromEntries(
          raw.voicePresets.map(
            (preset: { provider: string; voiceName: string; voiceVersion?: string }) => [
              `${preset.provider}::${preset.voiceName}::${preset.voiceVersion ?? ""}`,
              preset,
            ],
          ),
        )
      : raw.voicePresets,
  });
  await fs.writeFile(filePath, `${JSON.stringify(project, null, 2)}\n`);
  const timeline = toTimeline(
    project,
    previousItems.length > 0
      ? { durationSec: 0, tracks: [{ id: SEQUENCE_TRACK_ID, clips: previousItems }] }
      : undefined,
  );
  const timelinePath = filePath.replace(/\.json$/u, ".timeline.json");
  await fs.writeFile(timelinePath, `${JSON.stringify(timeline, null, 2)}\n`);
  console.info(`migrated ${path.relative(PROJECT_ROOT, filePath)}`);
}

const files = await listProjectFiles(DATA_DIR);
for (const file of files) {
  await migrateFile(file);
}
