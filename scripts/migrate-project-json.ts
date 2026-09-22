import fs from "node:fs/promises";
import path from "node:path";
import { SEQUENCE_TRACK_ID, savedProjectSchema } from "@/_schemas";
import { toTimeline } from "@/server/features/project/to-timeline";
import {
  createCommentScenesFromGroupIds,
  migratedCommentSceneId,
} from "@/server/features/project/comments-presentation";
import {
  ADVERTISERS_PATH,
  PROJECT_ROOT,
  PUBLISH_STATE_PATH,
  SCHEDULES_PATH,
} from "@/server/_shared/storage";

const DATA_DIR = path.join(PROJECT_ROOT, "data");
const SKIP_BASENAMES = new Set([
  path.basename(PUBLISH_STATE_PATH),
  path.basename(SCHEDULES_PATH),
  path.basename(ADVERTISERS_PATH),
  "render-state.json",
]);

async function listJsonFiles(dirPath: string, nestedPath = ""): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = nestedPath ? path.join(nestedPath, entry.name) : entry.name;
      const absolutePath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return listJsonFiles(absolutePath, relativePath);
      }
      if (
        !entry.isFile() ||
        !entry.name.endsWith(".json") ||
        entry.name.endsWith(".timeline.json") ||
        SKIP_BASENAMES.has(entry.name)
      ) {
        return [];
      }
      return [absolutePath];
    }),
  );
  return files.flat();
}

function withCommentsPresentation(raw: Record<string, unknown>) {
  const pages = Array.isArray(raw.pages) ? raw.pages : [];
  return {
    ...raw,
    pages: pages.map((page) => {
      if (!page || typeof page !== "object" || Array.isArray(page)) {
        return page;
      }
      const record = page as Record<string, unknown>;
      if (record.type !== "comments") {
        return page;
      }
      const meta =
        record.meta && typeof record.meta === "object" && !Array.isArray(record.meta)
          ? { ...(record.meta as Record<string, unknown>) }
          : {};
      if (meta.presentation !== "single" && meta.presentation !== "triple") {
        meta.presentation = "single";
      }
      if (Array.isArray(record.commentScenes)) {
        return { ...record, meta };
      }
      const groups = Array.isArray(record.commentGroups) ? record.commentGroups : [];
      const groupIds = groups.flatMap((group) => {
        if (!group || typeof group !== "object" || Array.isArray(group)) {
          return [];
        }
        const id = (group as { id?: unknown }).id;
        return typeof id === "string" && id.length > 0 ? [id] : [];
      });
      const presentation = meta.presentation === "triple" ? "triple" : "single";
      return {
        ...record,
        meta,
        commentScenes: createCommentScenesFromGroupIds(
          groupIds,
          presentation,
          migratedCommentSceneId,
        ),
      };
    }),
  };
}

function withRecordVoicePresets(raw: Record<string, unknown>) {
  const voicePresets = raw.voicePresets;
  if (!Array.isArray(voicePresets)) {
    return raw;
  }
  return {
    ...raw,
    voicePresets: Object.fromEntries(
      voicePresets.map((preset: { provider: string; voiceName: string; voiceVersion?: string }) => [
        `${preset.provider}::${preset.voiceName}::${preset.voiceVersion ?? ""}`,
        preset,
      ]),
    ),
  };
}

async function migrateFile(filePath: string) {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as Record<string, unknown>;
  if (!Array.isArray(raw.pages)) {
    return;
  }
  const pages = raw.pages;
  const previousItems = pages.flatMap(
    (page: { id?: string; durationSec?: number; type?: string }) => {
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
    },
  );
  const parsed = savedProjectSchema.safeParse(
    withCommentsPresentation(withRecordVoicePresets(raw)),
  );
  if (!parsed.success) {
    return;
  }
  const project = parsed.data;
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

const files = await listJsonFiles(DATA_DIR);
for (const file of files) {
  await migrateFile(file);
}
