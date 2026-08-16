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
  type VoicePreset,
  isDraftContentPage,
  isDraftTransition,
  isSavedContentPage,
  isSavedTransition,
  pageTypeRequiresTts,
  savedProjectSchema,
} from "@/_schemas";
import { nowIso } from "@/_shared/lib/date";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";
import { getEffectiveTtsSynthesisSettings } from "@/_shared/project/voice-presets";
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
import { ENDCARD_DURATION_SEC } from "@/_shared/lib/endcard/endcard-timing";
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
import { analyzeTexts } from "@/server/features/haqumei-api/analyze";
import { assertHaqumeiTextLength } from "@/server/features/haqumei-api/limits";
import {
  createPreviousTtsComparisonInput,
  createTtsComparisonInput,
  getTtsProvider,
} from "@/server/features/tts/providers/registry";
import { getUsableG2p } from "@/server/features/tts/providers/comparison";
import { stableStringify } from "@/server/_shared/stable-stringify";
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
  if (!pageTypeRequiresTts(page.type)) {
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

function withEffectiveSynthesisSettings<
  T extends Pick<DraftTts, "provider" | "voiceName" | "voiceVersion" | "synthesisSettings">,
>(item: T, presets: VoicePreset[]): T {
  const synthesisSettings = getEffectiveTtsSynthesisSettings(item, presets);
  return {
    ...item,
    synthesisSettings: synthesisSettings ?? undefined,
  };
}

async function shouldReusePreviousTts(
  item: DraftTts,
  projectPath: string,
  previous: SavedTts | undefined,
  nextPresets: VoicePreset[],
  previousPresets: VoicePreset[],
) {
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
    stableStringify(
      createPreviousTtsComparisonInput(withEffectiveSynthesisSettings(previous, previousPresets)),
    ) ===
    stableStringify(createTtsComparisonInput(withEffectiveSynthesisSettings(item, nextPresets)))
  );
}

type PlannedTts = {
  item: DraftTts;
  previous?: SavedTts;
  nextInput: TtsComparisonInput<DraftTts["provider"]>;
  reuse: boolean;
};

function needsG2pAnalyze(plan: PlannedTts) {
  if (plan.reuse) {
    return false;
  }

  if (!getTtsProvider(plan.nextInput.provider).usesG2p) {
    return false;
  }

  return !getUsableG2p(plan.nextInput.g2p, plan.nextInput.readText);
}

async function assignBatchG2p(serverEnv: ServerEnv, plans: PlannedTts[]) {
  const targets = plans.filter(needsG2pAnalyze);
  if (targets.length === 0) {
    return;
  }

  for (const plan of targets) {
    assertHaqumeiTextLength(plan.nextInput.readText, plan.item.id);
  }

  const items = await analyzeTexts(
    serverEnv,
    targets.map((plan) => plan.nextInput.readText),
  );

  for (const [index, plan] of targets.entries()) {
    const g2p = items[index];
    if (!g2p) {
      throw new Error(`haqumei-api analyze returned no item for tts ${plan.item.id}`);
    }
    plan.nextInput = { ...plan.nextInput, g2p };
  }
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
    ...(item.synthesisSettings ? { synthesisSettings: item.synthesisSettings } : {}),
    ...(item.avatar ? { avatar: item.avatar } : {}),
    durationSec: previous.durationSec,
    audio: previous.audio,
    speech: previous.speech,
  };
}

async function planSavedTts(
  projectPath: string,
  item: DraftTts,
  previous: SavedTts | undefined,
  nextPresets: VoicePreset[],
  previousPresets: VoicePreset[],
): Promise<PlannedTts> {
  validateTts(item);
  const nextInput = createTtsComparisonInput(withEffectiveSynthesisSettings(item, nextPresets));
  return {
    item,
    previous,
    nextInput,
    reuse: await shouldReusePreviousTts(item, projectPath, previous, nextPresets, previousPresets),
  };
}

async function buildSavedTts(serverEnv: ServerEnv, projectPath: string, plan: PlannedTts) {
  if (plan.reuse && plan.previous) {
    return createReusedSavedTts(plan.item, plan.previous);
  }

  const voiceVersion = getOptionalVoiceVersion(plan.nextInput.voiceVersion);
  const provider = getTtsProvider(plan.nextInput.provider);
  if (provider.usesG2p) {
    assertHaqumeiTextLength(plan.nextInput.readText, plan.item.id);
  }

  const audio = await provider.synthesize(serverEnv, {
    ...plan.nextInput,
    projectPath,
    ...(voiceVersion ? { voiceVersion } : {}),
  } as never);

  return createSavedTts(plan.item, plan.nextInput, audio, voiceVersion);
}

function getOptionalVoiceVersion(value: string) {
  return value || undefined;
}

function createSavedTts(
  item: DraftTts,
  nextInput: TtsComparisonInput<DraftTts["provider"]>,
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
    ...(item.synthesisSettings ? { synthesisSettings: item.synthesisSettings } : {}),
    ...(item.avatar ? { avatar: item.avatar } : {}),
    durationSec: audio.durationSec + AUDIO_PADDING_SECONDS,
    audio: {
      src: audio.audioSrc,
    },
    speech: nextInput.g2p ? { g2p: nextInput.g2p } : {},
  };
}

async function planSavedPage(
  projectPath: string,
  page: DraftPage,
  previousTtsById: Map<string, SavedTts>,
  nextPresets: VoicePreset[],
  previousPresets: VoicePreset[],
) {
  validatePage(page);
  const tts = await Promise.all(
    page.tts.map((item) =>
      planSavedTts(projectPath, item, previousTtsById.get(item.id), nextPresets, previousPresets),
    ),
  );

  return { page, tts };
}

async function buildSavedPage(
  serverEnv: ServerEnv,
  projectPath: string,
  planned: { page: DraftPage; tts: PlannedTts[] },
): Promise<SavedPage> {
  const tts = (await Promise.all(
    planned.tts.map((plan) => buildSavedTts(serverEnv, projectPath, plan)),
  )) as SavedTts[];
  const page = planned.page;

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

  if (page.type === "endcard") {
    return {
      id: page.id,
      title: page.title,
      type: page.type,
      meta: page.meta,
      padBeforeSec: page.padBeforeSec,
      padAfterSec: page.padAfterSec,
      durationSec: Math.max(
        MIN_TTS_DURATION_SECONDS,
        ENDCARD_DURATION_SEC + page.padBeforeSec + page.padAfterSec,
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
  const nextPresets = draft.voicePresets ?? [];
  const previousPresets = previousProject?.voicePresets ?? [];
  const plannedPages = await Promise.all(
    draft.pages.map(async (item) => {
      if (isDraftTransition(item)) {
        return { type: "transition" as const, item };
      }
      return {
        type: "page" as const,
        planned: await planSavedPage(
          projectPath,
          item,
          previousTtsById,
          nextPresets,
          previousPresets,
        ),
      };
    }),
  );
  await assignBatchG2p(
    serverEnv,
    plannedPages.flatMap((item) => (item.type === "page" ? item.planned.tts : [])),
  );
  const pages = await Promise.all(
    plannedPages.map(async (item) => {
      if (item.type === "transition") {
        return buildSavedTransition(item.item);
      }
      return buildSavedPage(serverEnv, projectPath, item.planned);
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
