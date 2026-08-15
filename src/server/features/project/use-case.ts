import fs from "node:fs/promises";
import {
  type ProjectFileSummary,
  type DraftPage,
  type DraftProjectInput,
  type DraftSequenceItem,
  type DraftTransition,
  type DraftTts,
  type SavedPage,
  type SavedProject,
  type SavedSequenceItem,
  type SavedTts,
  isDraftContentPage,
  isDraftTransition,
  isSavedContentPage,
  isSavedTransition,
  savedProjectSchema,
} from "@/_schemas";
import { nowIso } from "@/_shared/lib/date";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";
import { getDefaultProjectMeta, normalizeProjectMeta } from "@/_shared/project/project-meta";
import { VIDEO_FPS } from "@/constants";
import { getTransitionDurationSec } from "@/remotion/transitions/variants";
import {
  OUTRO_BLOCKS_PER_PAGE,
  OUTRO_CARDS_DELAY_SEC,
  OUTRO_PAPER_FADE_OUT_SEC,
  OUTRO_PAPER_HOLD_AFTER_PAGE_SEC,
  OUTRO_PAGE_DURATION_SEC,
} from "@/_shared/lib/outro/outro-timing";
import { secondsToFrames } from "@/remotion/utils/timing";
import { createTtsTimingSegments, getTtsTimingEndSec } from "@/_shared/lib/tts/tts-timing";
import {
  isProjectTtsSrc,
  listSavedProjects,
  parseDraftPayload,
  readSavedProject,
  createSavedProject,
  resolvePublicAssetPath,
  writeSavedProject,
} from "@/server/_shared/storage";
import type { ServerEnv } from "@/server/core/env";
import {
  createPreviousTtsComparisonInput,
  createTtsComparisonInput,
  getTtsProvider,
} from "@/server/features/tts/providers/registry";
import type { TtsComparisonInput } from "@/server/features/tts/providers/types";

const AUDIO_PADDING_SECONDS = 0.1;
const MIN_TTS_DURATION_SECONDS = 1 / VIDEO_FPS;
const DEFAULT_TTS_PLAYBACK_SETTINGS = {
  padBeforeSec: 0,
  padAfterSec: 0,
  volume: 1,
};

function getOutroContentDurationSec(blockCount: number) {
  const pageCount = Math.ceil(blockCount / OUTRO_BLOCKS_PER_PAGE);
  if (pageCount <= 0) {
    return 0;
  }

  return (
    OUTRO_CARDS_DELAY_SEC +
    pageCount * OUTRO_PAGE_DURATION_SEC +
    OUTRO_PAPER_HOLD_AFTER_PAGE_SEC +
    OUTRO_PAPER_FADE_OUT_SEC
  );
}

function getTtsPlaybackSettings(item: Pick<DraftTts, "padBeforeSec" | "padAfterSec" | "volume">) {
  return {
    padBeforeSec: item.padBeforeSec ?? DEFAULT_TTS_PLAYBACK_SETTINGS.padBeforeSec,
    padAfterSec: item.padAfterSec ?? DEFAULT_TTS_PLAYBACK_SETTINGS.padAfterSec,
    volume: item.volume ?? DEFAULT_TTS_PLAYBACK_SETTINGS.volume,
  };
}

function sequenceDurationInFrames(durationSec: number) {
  return Math.max(1, secondsToFrames(durationSec, VIDEO_FPS));
}

function validateSequenceItems(items: DraftSequenceItem[]) {
  if (items.length === 0) {
    return;
  }

  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    return;
  }

  if (isDraftTransition(first) || isDraftTransition(last)) {
    throw new Error("transition must be between content pages");
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || !isDraftTransition(item)) {
      continue;
    }

    const prev = items[index - 1];
    const next = items[index + 1];
    if (!prev || !next || !isDraftContentPage(prev) || !isDraftContentPage(next)) {
      throw new Error(`transition ${item.id} must be between content pages`);
    }
  }
}

function validateTransitionSequenceDurations(pages: SavedSequenceItem[]) {
  for (let index = 0; index < pages.length; index += 1) {
    const item = pages[index];
    if (!item || !isSavedTransition(item)) {
      continue;
    }

    const transitionFrames = sequenceDurationInFrames(getTransitionDurationSec(item.variant));
    const neighbors = [pages[index - 1], pages[index + 1]];

    for (const neighbor of neighbors) {
      if (!neighbor || !isSavedContentPage(neighbor)) {
        continue;
      }

      const pageFrames = sequenceDurationInFrames(neighbor.durationSec);
      if (pageFrames < transitionFrames) {
        throw new Error(
          `page ${neighbor.id} (${pageFrames} frames) must be at least as long as adjacent transition ${item.id} (${transitionFrames} frames)`,
        );
      }
    }
  }
}

function validatePage(page: DraftPage) {
  if (page.type === "outro") {
    return;
  }

  if (page.tts.length === 0) {
    throw new Error(`at least one tts is required for page ${page.id}`);
  }
}

function validateTts(item: DraftTts) {
  if (!item.text.trim()) {
    throw new Error(`text is required for tts ${item.id}`);
  }

  if (!item.voiceName?.trim()) {
    throw new Error(`voiceName is required for tts ${item.id}`);
  }
}

async function audioFileExists(src: string) {
  if (!src.trim()) {
    return false;
  }

  try {
    await fs.access(resolvePublicAssetPath(src));
    return true;
  } catch {
    return false;
  }
}

async function shouldReusePreviousTts(item: DraftTts, projectPath: string, previous?: SavedTts) {
  if (!previous) {
    return false;
  }

  if (!isProjectTtsSrc(previous.audio.src, projectPath)) {
    return false;
  }

  if (!(await audioFileExists(previous.audio.src))) {
    return false;
  }

  return (
    JSON.stringify(createPreviousTtsComparisonInput(previous)) ===
    JSON.stringify(createTtsComparisonInput(item))
  );
}

async function resolveAnalysis(
  serverEnv: ServerEnv,
  nextInput: TtsComparisonInput<DraftTts["provider"]>,
  options: { forceAnalyze: boolean },
) {
  if (!options.forceAnalyze && nextInput.analysis) {
    return nextInput.analysis;
  }

  return getTtsProvider(nextInput.provider).analyze(serverEnv, nextInput as never);
}

function hasReadTextChanged(
  nextInput: TtsComparisonInput<DraftTts["provider"]>,
  previous?: SavedTts,
) {
  if (!previous) {
    return false;
  }

  return createPreviousTtsComparisonInput(previous).readText !== nextInput.readText;
}

function hasProviderChanged(item: DraftTts, previous?: SavedTts) {
  return Boolean(previous) && previous!.provider !== item.provider;
}

function createReusedSavedTts(item: DraftTts, previous: SavedTts) {
  return {
    id: previous.id,
    provider: previous.provider,
    text: previous.text,
    readText: previous.readText,
    voiceName: previous.voiceName,
    ...(previous.voiceVersion ? { voiceVersion: previous.voiceVersion } : {}),
    ...getTtsPlaybackSettings(item),
    ...(previous.synthesisSettings ? { synthesisSettings: previous.synthesisSettings } : {}),
    ...(item.avatar ? { avatar: item.avatar } : {}),
    durationSec: previous.durationSec,
    audio: previous.audio,
    speech: previous.speech,
  };
}

async function buildSavedTts(
  serverEnv: ServerEnv,
  projectPath: string,
  item: DraftTts,
  previous?: SavedTts,
) {
  validateTts(item);
  if (await shouldReusePreviousTts(item, projectPath, previous)) {
    return createReusedSavedTts(item, previous!);
  }

  const nextInput = createTtsComparisonInput(item);
  const analysis = await resolveAnalysis(serverEnv, nextInput, {
    forceAnalyze: hasReadTextChanged(nextInput, previous) || hasProviderChanged(item, previous),
  });
  const voiceVersion = getOptionalVoiceVersion(nextInput.voiceVersion);
  const provider = getTtsProvider(nextInput.provider);
  const audio = await provider.synthesize(serverEnv, {
    ...nextInput,
    analysis,
    projectPath,
    ...(voiceVersion ? { voiceVersion } : {}),
  } as never);

  return createSavedTts(item, nextInput, analysis, audio, voiceVersion);
}

function getOptionalVoiceVersion(value: string) {
  return value || undefined;
}

function createSavedTts(
  item: DraftTts,
  nextInput: TtsComparisonInput<DraftTts["provider"]>,
  analysis: string,
  audio: { audioSrc: string; durationSec: number },
  voiceVersion?: string,
) {
  return {
    id: item.id,
    provider: item.provider,
    text: item.text,
    readText: nextInput.readText,
    voiceName: nextInput.voiceName,
    ...(voiceVersion ? { voiceVersion } : {}),
    ...getTtsPlaybackSettings(item),
    ...(nextInput.synthesisSettings ? { synthesisSettings: nextInput.synthesisSettings } : {}),
    ...(item.avatar ? { avatar: item.avatar } : {}),
    durationSec: audio.durationSec + AUDIO_PADDING_SECONDS,
    audio: {
      src: audio.audioSrc,
    },
    speech: {
      analysis,
    },
  };
}

async function buildSavedPage(
  serverEnv: ServerEnv,
  projectPath: string,
  page: DraftPage,
  previousTtsById: Map<string, SavedTts>,
): Promise<SavedPage> {
  validatePage(page);
  const tts = (await Promise.all(
    page.tts.map((item) =>
      buildSavedTts(serverEnv, projectPath, item, previousTtsById.get(item.id)),
    ),
  )) as SavedTts[];

  if (page.type === "outro") {
    const contentDurationSec = getOutroContentDurationSec(page.meta.blocks.length);
    return {
      id: page.id,
      title: page.title,
      type: page.type,
      meta: page.meta,
      padBeforeSec: page.padBeforeSec,
      padAfterSec: page.padAfterSec,
      durationSec: Math.max(
        MIN_TTS_DURATION_SECONDS,
        contentDurationSec + page.padBeforeSec + page.padAfterSec,
      ),
      richText: page.richText,
      tts,
    };
  }

  const ttsDurationSec = getTtsTimingEndSec(
    createTtsTimingSegments(tts, {
      minDurationSec: MIN_TTS_DURATION_SECONDS,
    }),
  );

  return {
    id: page.id,
    title: page.title,
    type: page.type,
    meta: page.meta,
    padBeforeSec: page.padBeforeSec,
    padAfterSec: page.padAfterSec,
    durationSec: Math.max(
      MIN_TTS_DURATION_SECONDS,
      ttsDurationSec + page.padBeforeSec + page.padAfterSec,
    ),
    richText: page.richText,
    tts,
  };
}

function buildSavedTransition(transition: DraftTransition) {
  return {
    id: transition.id,
    type: "transition" as const,
    variant: transition.variant,
  };
}

function buildPreviousTtsMap(previousProject?: SavedProject) {
  return new Map(
    previousProject?.pages
      .filter(isSavedContentPage)
      .flatMap((page) => page.tts)
      .map((item) => [item.id, item]) ?? [],
  );
}

function getProjectTitleFromPath(projectPath: string) {
  return projectPath.split("/").filter(Boolean).at(-1) ?? "project";
}

async function buildSavedProject(
  serverEnv: ServerEnv,
  payload: unknown,
  projectPath: string,
  previousProject?: SavedProject,
): Promise<SavedProject> {
  const draft = parseDraftPayload(payload);
  validateSequenceItems(draft.pages);
  const previousTtsById = buildPreviousTtsMap(previousProject);
  const meta = {
    ...normalizeProjectMeta(draft.meta, {
      titleFallback: getProjectTitleFromPath(projectPath),
    }),
    updatedAt: nowIso(),
  };
  const pages = await Promise.all(
    draft.pages.map(async (item) => {
      if (isDraftTransition(item)) {
        return buildSavedTransition(item);
      }
      return buildSavedPage(serverEnv, projectPath, item, previousTtsById);
    }),
  );
  validateTransitionSequenceDurations(pages);

  return savedProjectSchema.parse({
    meta,
    bgm: draft.bgm,
    pages,
    voicePresets: draft.voicePresets,
  });
}

export async function listProjects(): Promise<ProjectFileSummary[]> {
  return listSavedProjects();
}

export async function createProject(projectPath: string) {
  return createSavedProject(
    projectPath,
    savedProjectSchema.parse({
      meta: {
        ...getDefaultProjectMeta(getProjectTitleFromPath(projectPath)),
        updatedAt: nowIso(),
      },
      bgm: [],
      pages: [],
      voicePresets: getDefaultVoicePresets(),
    }),
  );
}

export async function copyProject(sourceProjectPath: string, targetProjectPath: string) {
  const project = await readSavedProject(sourceProjectPath);
  return createSavedProject(targetProjectPath, {
    ...project,
    meta: {
      ...project.meta,
      updatedAt: nowIso(),
    },
  });
}

export async function loadProject(projectPath: string) {
  return readSavedProject(projectPath);
}

export async function saveProject(
  serverEnv: ServerEnv,
  projectPath: string,
  payload: DraftProjectInput,
) {
  const previousProject = await readSavedProject(projectPath);
  const project = await buildSavedProject(serverEnv, payload, projectPath, previousProject);
  await writeSavedProject(projectPath, project);
  return project;
}
