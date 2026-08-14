import { VIDEO_SIZE_PRESETS } from "@/constants";
import type { WeatherForecasts } from "@/_schemas";

export type VideoSizePresetId = (typeof VIDEO_SIZE_PRESETS)[number]["id"];

export type ProjectNiconicoMeta = {
  title: string;
  description: string;
  thumbnailTime: string;
  parentWorkIds: string[];
};

type ProjectMetaLike = {
  title: string;
  description: string;
  width: number;
  height: number;
  updatedAt?: string;
  weather: WeatherForecasts;
  niconico: ProjectNiconicoMeta;
};

const DEFAULT_PROJECT_TITLE = "project";
const DEFAULT_VIDEO_SIZE_PRESET = VIDEO_SIZE_PRESETS[0];
const DEFAULT_THUMBNAIL_TIME = "00:00.000";
const PARENT_WORK_ID_PATTERN = /^(?:sm|ss)\d+$/;
const VIDEO_SIZE_PRESETS_BY_SIZE = new Map(
  VIDEO_SIZE_PRESETS.map((preset) => [getVideoSizeKey(preset), preset]),
);

function getVideoSizeKey({ width, height }: { width: number; height: number }) {
  return `${width}x${height}`;
}

function normalizeProjectTitle(value: string | undefined, fallback = DEFAULT_PROJECT_TITLE) {
  return value?.trim() || fallback;
}

export function getDefaultNiconicoMeta(): ProjectNiconicoMeta {
  return {
    title: "",
    description: "",
    thumbnailTime: DEFAULT_THUMBNAIL_TIME,
    parentWorkIds: [],
  };
}

function normalizeThumbnailTime(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return /^\d{2}:[0-5]\d\.\d{3}$/.test(trimmed) ? trimmed : DEFAULT_THUMBNAIL_TIME;
}

function normalizeParentWorkIds(value: string[] | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((id) => id.trim()).filter((id) => PARENT_WORK_ID_PATTERN.test(id)))];
}

export function normalizeNiconicoMeta(
  value: Partial<ProjectNiconicoMeta> | undefined,
): ProjectNiconicoMeta {
  const defaults = getDefaultNiconicoMeta();
  return {
    title: value?.title?.trim() ?? defaults.title,
    description: value?.description ?? defaults.description,
    thumbnailTime: normalizeThumbnailTime(value?.thumbnailTime),
    parentWorkIds: normalizeParentWorkIds(value?.parentWorkIds),
  };
}

export function parseParentWorkIdsInput(value: string) {
  return normalizeParentWorkIds(value.split(/[\s,]+/u));
}

export function formatParentWorkIdsInput(ids: string[]) {
  return ids.join(" ");
}

export function getDefaultProjectMeta(title = DEFAULT_PROJECT_TITLE): ProjectMetaLike {
  return {
    title: normalizeProjectTitle(title),
    description: "",
    width: DEFAULT_VIDEO_SIZE_PRESET.width,
    height: DEFAULT_VIDEO_SIZE_PRESET.height,
    weather: {},
    niconico: getDefaultNiconicoMeta(),
  };
}

export function getProjectVideoSizePresetId({
  width,
  height,
}: {
  width: number;
  height: number;
}): VideoSizePresetId {
  return normalizeProjectVideoSize({ width, height }).id;
}

function normalizeProjectVideoSize({ width, height }: { width: number; height: number }) {
  return (
    VIDEO_SIZE_PRESETS_BY_SIZE.get(getVideoSizeKey({ width, height })) ?? DEFAULT_VIDEO_SIZE_PRESET
  );
}

export function normalizeProjectMeta(
  meta: Partial<ProjectMetaLike> | undefined,
  options: { titleFallback?: string } = {},
): ProjectMetaLike {
  const defaultMeta = getDefaultProjectMeta(options.titleFallback);
  const input = { ...defaultMeta, ...meta };
  const size = normalizeProjectVideoSize({
    width: input.width,
    height: input.height,
  });

  return {
    title: normalizeProjectTitle(input.title, defaultMeta.title),
    description: input.description,
    width: size.width,
    height: size.height,
    ...(input.updatedAt ? { updatedAt: input.updatedAt } : {}),
    weather: input.weather,
    niconico: normalizeNiconicoMeta(meta?.niconico ?? input.niconico),
  };
}
