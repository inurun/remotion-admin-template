import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  projectFileSummarySchema,
  savedProjectSchema,
  type ProjectFileSummary,
  type SavedProject,
} from "@/_schemas";
import { getDefaultProjectMeta } from "@/_shared/project/project-meta";

export const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
export const TTS_DIR = path.join(PUBLIC_DIR, "tts");
export const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
export const MUSICS_DIR = path.join(PUBLIC_DIR, "bgm");
export const OUT_DIR = path.join(PROJECT_ROOT, "out");
export const RENDER_STATE_PATH = path.join(DATA_DIR, "render-state.json");
export const PUBLISH_STATE_PATH = path.join(DATA_DIR, "publish-state.json");
export const LATEST_VIDEO_PATH = path.join(OUT_DIR, "latest.mp4");

const DEFAULT_PROJECT_PATH = "project";
const PROJECT_FILE_EXTENSION = ".json";
const PROJECT_LIST_EXCLUDE = new Set([
  path.basename(RENDER_STATE_PATH),
  path.basename(PUBLISH_STATE_PATH),
]);
const INVALID_PROJECT_PATH_MESSAGE = "Invalid project path";

export class InvalidProjectPathError extends Error {}

export class ProjectNotFoundError extends Error {}

export class ProjectAlreadyExistsError extends Error {}

function createInitialSavedProject() {
  return savedProjectSchema.parse({
    meta: getDefaultProjectMeta(DEFAULT_PROJECT_PATH),
    bgm: [],
    pages: [
      {
        id: "page-1",
        title: "Page 1",
        type: "main",
        padBeforeSec: 0,
        padAfterSec: 0,
        durationSec: 0,
        richText:
          "<h1>Remotion + VoiSona Template</h1><p>このテンプレをベースに本文と読み上げを編集できる。</p>",
        tts: [
          {
            id: "tts-1",
            provider: "voisona",
            text: "このテンプレをベースに本文と読み上げを編集できる。",
            readText: "このテンプレをベースにほんぶんとよみあげをへんしゅうできる。",
            voiceName: "",
            voiceVersion: "",
            durationSec: 0,
            audio: {
              src: "",
            },
            speech: {},
          },
        ],
      },
    ],
  });
}

function throwInvalidProjectPath() {
  throw new InvalidProjectPathError(INVALID_PROJECT_PATH_MESSAGE);
}

function normalizeProjectPathSegment(segment: string) {
  const value = segment.trim();
  assertSegmentHasContent(value);
  assertSegmentHasNoNullByte(value);
  assertSegmentHasNoPathSeparator(value);
  return value;
}

function assertSegmentHasContent(segment: string) {
  if (!segment || segment === "." || segment === "..") {
    throwInvalidProjectPath();
  }
}

function assertSegmentHasNoNullByte(segment: string) {
  if (segment.includes("\0")) {
    throwInvalidProjectPath();
  }
}

function assertSegmentHasNoPathSeparator(segment: string) {
  if (segment.includes(path.sep) || segment.includes("/")) {
    throwInvalidProjectPath();
  }
}

export function normalizeProjectPath(projectPath: string) {
  const normalized = projectPath
    .split("/")
    .filter(Boolean)
    .map(normalizeProjectPathSegment)
    .join("/");

  if (!normalized || normalized.endsWith(PROJECT_FILE_EXTENSION)) {
    throwInvalidProjectPath();
  }

  return normalized;
}

export function getProjectTtsDir(projectPath: string) {
  return path.join(TTS_DIR, normalizeProjectPath(projectPath));
}

export function getProjectUploadsDir(projectPath: string) {
  return path.join(UPLOADS_DIR, normalizeProjectPath(projectPath));
}

export function toProjectTtsSrc(projectPath: string, fileName: string) {
  return `/tts/${normalizeProjectPath(projectPath)}/${fileName}`;
}

export function toProjectUploadsSrc(projectPath: string, fileName: string) {
  return `/uploads/${normalizeProjectPath(projectPath)}/${fileName}`;
}

export function resolvePublicAssetPath(src: string) {
  return getPublicFilePath(src.replace(/^\/+/u, ""));
}

export function isProjectTtsSrc(src: string, projectPath: string) {
  const prefix = `/tts/${normalizeProjectPath(projectPath)}/`;
  return src.startsWith(prefix) && !src.slice(prefix.length).includes("..");
}

export async function clearProjectTtsCache(projectPath: string) {
  await fs.rm(getProjectTtsDir(projectPath), { recursive: true, force: true });
}

function createProjectFilePath(projectPath: string) {
  const normalizedPath = normalizeProjectPath(projectPath);
  const filePath = path.resolve(DATA_DIR, `${normalizedPath}${PROJECT_FILE_EXTENSION}`);
  const dataRoot = `${DATA_DIR}${path.sep}`;

  if (!filePath.startsWith(dataRoot)) {
    throwInvalidProjectPath();
  }

  return filePath;
}

function toProjectSummary(relativePath: string, updatedAt: number): ProjectFileSummary {
  const pathWithoutExtension = relativePath.slice(0, -PROJECT_FILE_EXTENSION.length);
  const segments = pathWithoutExtension.split(path.sep).filter(Boolean);
  const name = segments[segments.length - 1];

  return projectFileSummarySchema.parse({
    path: segments.join("/"),
    name,
    segments,
    updatedAt: Math.trunc(updatedAt),
  });
}

function shouldIncludeProjectFile(entryName: string, isFile: boolean) {
  return (
    isFile && entryName.endsWith(PROJECT_FILE_EXTENSION) && !PROJECT_LIST_EXCLUDE.has(entryName)
  );
}

async function readProjectSummaryFile(relativePath: string, absolutePath: string) {
  const stats = await fs.stat(absolutePath);
  return toProjectSummary(relativePath, stats.mtimeMs);
}

async function readProjectSummary(projectPath: string) {
  const filePath = createProjectFilePath(projectPath);
  const relativePath = `${normalizeProjectPath(projectPath)}${PROJECT_FILE_EXTENSION}`;
  return readProjectSummaryFile(relativePath, filePath);
}

async function collectProjectEntrySummaries(
  entry: Dirent,
  dirPath: string,
  nestedPath: string,
): Promise<ProjectFileSummary[]> {
  const entryName = entry.name.toString();
  const relativePath = nestedPath ? path.join(nestedPath, entryName) : entryName;
  const absolutePath = path.join(dirPath, entryName);

  if (entry.isDirectory()) {
    return collectProjectFiles(absolutePath, relativePath);
  }

  if (!shouldIncludeProjectFile(entryName, entry.isFile())) {
    return [];
  }

  return [await readProjectSummaryFile(relativePath, absolutePath)];
}

function sortProjectsByUpdatedAt(projects: ProjectFileSummary[]) {
  return projects.sort((left, right) => right.updatedAt - left.updatedAt);
}

async function collectProjectFiles(
  dirPath: string,
  nestedPath = "",
): Promise<ProjectFileSummary[]> {
  const entries = await fs.readdir(dirPath, { encoding: "utf8", withFileTypes: true });
  const nestedSummaries = await Promise.all(
    entries.map((entry) => collectProjectEntrySummaries(entry, dirPath, nestedPath)),
  );
  return sortProjectsByUpdatedAt(nestedSummaries.flat());
}

async function ensureDefaultProjectFile() {
  const projectPath = createProjectFilePath(DEFAULT_PROJECT_PATH);

  try {
    await fs.access(projectPath);
  } catch {
    await writeSavedProject(DEFAULT_PROJECT_PATH, createInitialSavedProject());
  }
}

export async function ensureProjectDirs() {
  await Promise.all([
    fs.mkdir(DATA_DIR, { recursive: true }),
    fs.mkdir(PUBLIC_DIR, { recursive: true }),
    fs.mkdir(TTS_DIR, { recursive: true }),
    fs.mkdir(UPLOADS_DIR, { recursive: true }),
    fs.mkdir(MUSICS_DIR, { recursive: true }),
    fs.mkdir(OUT_DIR, { recursive: true }),
  ]);
}

export async function listSavedProjects() {
  await ensureProjectDirs();
  const files = await collectProjectFiles(DATA_DIR);
  if (files.length > 0) {
    return files;
  }

  await ensureDefaultProjectFile();
  return collectProjectFiles(DATA_DIR);
}

export async function readSavedProject(projectPath: string): Promise<SavedProject> {
  await ensureProjectDirs();
  const filePath = createProjectFilePath(projectPath);

  try {
    const content = await fs.readFile(filePath, "utf8");
    return savedProjectSchema.parse(JSON.parse(content));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ProjectNotFoundError(`Project not found: ${projectPath}`);
    }
    throw error;
  }
}

export function createProjectWriteTempPath(filePath: string) {
  return `${filePath}.${process.pid}.${randomUUID()}.tmp`;
}

export async function writeSavedProject(projectPath: string, project: SavedProject) {
  await ensureProjectDirs();
  const filePath = createProjectFilePath(projectPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = createProjectWriteTempPath(filePath);
  try {
    await fs.writeFile(tempPath, JSON.stringify(project, null, 2));
    await fs.rename(tempPath, filePath);
  } catch (error) {
    try {
      await fs.rm(tempPath, { force: true });
    } catch {
      // ignore cleanup errors
    }
    throw error;
  }
}

export async function createSavedProject(projectPath: string, project: SavedProject) {
  await ensureProjectDirs();
  const filePath = createProjectFilePath(projectPath);

  try {
    await fs.access(filePath);
    throw new ProjectAlreadyExistsError(`Project already exists: ${projectPath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await writeSavedProject(projectPath, project);
  return readProjectSummary(projectPath);
}

export function getPublicFilePath(urlPath: string) {
  const normalized = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(PUBLIC_DIR, normalized);
}
