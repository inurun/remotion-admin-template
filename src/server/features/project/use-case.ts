import fs from "node:fs/promises";
import {
  type ProjectFileSummary,
  type SavedPage,
  type SavedProject,
  type SavedSequenceItem,
  type SavedTts,
  type VoicePreset,
  isContentPage,
  isSavedContentPage,
  isTransition,
  pageTypeRequiresTts,
  savedProjectSchema,
} from "@/_schemas";
import { nowIso } from "@/_shared/lib/date";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";
import { getEffectiveTtsSynthesisSettings } from "@/_shared/project/voice-presets";
import { getDefaultProjectMeta, normalizeProjectMeta } from "@/_shared/project/project-meta";
import {
  isProjectTtsSrc,
  listSavedProjects,
  readSavedProject,
  createSavedProject,
  getProjectFileStem,
  resolvePublicAssetPath,
  writeSavedProject,
} from "@/server/_shared/storage";
import type {
  SavePageItem,
  SaveProjectChangesRequest,
  SaveSequenceItem,
  SaveTransitionItem,
  SaveTtsItem,
} from "@/server/features/project/contract";
import { isSaveTransitionItem } from "@/server/features/project/contract";
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
import type { PlannedSynthesis, TtsComparisonInput } from "@/server/features/tts/providers/types";
import { readCachedWav } from "@/server/features/tts/wav-cache";
import type { SynthesizeResponse } from "@/server/features/tts/contract";
import {
  AUDIO_PADDING_SECONDS,
  finalizeSequenceDurations,
  withSavedPageDurations,
} from "@/server/features/project/page-duration";
import { enqueueProjectMutation } from "@/server/features/project/project-mutation-queue";
import {
  hasInFlightSynthesisJob,
  startSynthesisBatch,
  type SynthesisJob,
} from "@/server/features/project/tts-synthesis-jobs";

const DEFAULT_TTS_PLAYBACK_SETTINGS = {
  padBeforeSec: 0,
  padAfterSec: 0,
  volume: 1,
};

function getTtsPlaybackSettings(
  item: Pick<SaveTtsItem, "padBeforeSec" | "padAfterSec" | "volume">,
) {
  return {
    padBeforeSec: item.padBeforeSec ?? DEFAULT_TTS_PLAYBACK_SETTINGS.padBeforeSec,
    padAfterSec: item.padAfterSec ?? DEFAULT_TTS_PLAYBACK_SETTINGS.padAfterSec,
    volume: item.volume ?? DEFAULT_TTS_PLAYBACK_SETTINGS.volume,
  };
}

function validateSequenceItems(items: Array<SaveSequenceItem | SavedSequenceItem>) {
  if (items.length === 0) {
    return;
  }

  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    return;
  }

  if (isTransition(first) || isTransition(last)) {
    throw new Error("transition must be between content pages");
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || !isTransition(item)) {
      continue;
    }

    const prev = items[index - 1];
    const next = items[index + 1];
    if (!prev || !next || !isContentPage(prev) || !isContentPage(next)) {
      throw new Error(`transition ${item.id} must be between content pages`);
    }
  }
}

function validatePage(page: SavePageItem) {
  if (!pageTypeRequiresTts(page.type)) {
    return;
  }

  if (page.tts.length === 0) {
    throw new Error(`at least one tts is required for page ${page.id}`);
  }
}

function validateTts(item: SaveTtsItem) {
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
  T extends Pick<SaveTtsItem, "provider" | "voiceName" | "voiceVersion" | "synthesisSettings">,
>(item: T, presets: VoicePreset[]): T {
  const synthesisSettings = getEffectiveTtsSynthesisSettings(item, presets);
  return {
    ...item,
    synthesisSettings: synthesisSettings ?? undefined,
  };
}

function comparisonInputMatches(
  item: SaveTtsItem,
  previous: SavedTts,
  nextPresets: VoicePreset[],
  previousPresets: VoicePreset[],
) {
  return (
    stableStringify(
      createPreviousTtsComparisonInput(withEffectiveSynthesisSettings(previous, previousPresets)),
    ) ===
    stableStringify(createTtsComparisonInput(withEffectiveSynthesisSettings(item, nextPresets)))
  );
}

type TtsReuseKind = "ready" | "pending" | "failed" | "none";

async function classifyTtsReuse(
  item: SaveTtsItem,
  projectPath: string,
  previous: SavedTts | undefined,
  nextPresets: VoicePreset[],
  previousPresets: VoicePreset[],
  forceResynthesis: boolean,
): Promise<TtsReuseKind> {
  if (!previous || forceResynthesis) {
    return "none";
  }

  if (!comparisonInputMatches(item, previous, nextPresets, previousPresets)) {
    return "none";
  }

  if (previous.audio.status === "pending") {
    return "pending";
  }

  if (previous.audio.status === "failed") {
    return "failed";
  }

  if (!isProjectTtsSrc(previous.audio.src, projectPath)) {
    return "none";
  }

  if (!(await audioFileExists(previous.audio.src))) {
    return "none";
  }

  return "ready";
}

type PlannedTts = {
  item: SaveTtsItem;
  previous?: SavedTts;
  nextInput: TtsComparisonInput<SaveTtsItem["provider"]>;
  reuse: TtsReuseKind;
};

function needsG2pAnalyze(plan: PlannedTts) {
  if (plan.reuse !== "none") {
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

function createTtsFields(
  item: SaveTtsItem,
  nextInput: TtsComparisonInput<SaveTtsItem["provider"]>,
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
    speech: nextInput.g2p ? { g2p: nextInput.g2p } : {},
  };
}

function createReusedSavedTts(item: SaveTtsItem, previous: SavedTts) {
  return {
    ...createTtsFields(
      item,
      createPreviousTtsComparisonInput(previous),
      getOptionalVoiceVersion(previous.voiceVersion ?? ""),
    ),
    audio: previous.audio,
  };
}

function createReadySavedTts(
  item: SaveTtsItem,
  nextInput: TtsComparisonInput<SaveTtsItem["provider"]>,
  audio: SynthesizeResponse,
  voiceVersion?: string,
) {
  return {
    ...createTtsFields(item, nextInput, voiceVersion),
    audio: {
      status: "ready" as const,
      src: audio.audioSrc,
      durationSec: audio.durationSec + AUDIO_PADDING_SECONDS,
    },
  };
}

function createPendingSavedTts(
  item: SaveTtsItem,
  nextInput: TtsComparisonInput<SaveTtsItem["provider"]>,
  audioSrc: string,
  voiceVersion?: string,
) {
  return {
    ...createTtsFields(item, nextInput, voiceVersion),
    audio: {
      status: "pending" as const,
      src: audioSrc,
    },
  };
}

async function planSavedTts(
  projectPath: string,
  item: SaveTtsItem,
  previous: SavedTts | undefined,
  nextPresets: VoicePreset[],
  previousPresets: VoicePreset[],
  forceResynthesis = false,
): Promise<PlannedTts> {
  validateTts(item);
  const nextInput = createTtsComparisonInput(withEffectiveSynthesisSettings(item, nextPresets));
  return {
    item,
    previous,
    nextInput,
    reuse: await classifyTtsReuse(
      item,
      projectPath,
      previous,
      nextPresets,
      previousPresets,
      forceResynthesis,
    ),
  };
}

function planProviderSynthesis(
  serverEnv: ServerEnv,
  projectPath: string,
  itemId: string,
  nextInput: TtsComparisonInput<SaveTtsItem["provider"]>,
): PlannedSynthesis {
  const voiceVersion = getOptionalVoiceVersion(nextInput.voiceVersion);
  const provider = getTtsProvider(nextInput.provider);
  if (provider.usesG2p) {
    assertHaqumeiTextLength(nextInput.readText, itemId);
  }

  return provider.plan(serverEnv, {
    ...nextInput,
    projectPath,
    ...(voiceVersion ? { voiceVersion } : {}),
  } as never);
}

function shouldSkipPendingJob(
  projectPath: string,
  previous: SavedTts | undefined,
  audioSrc: string,
  forceResynthesis: boolean,
) {
  if (!forceResynthesis || !previous || previous.audio.status !== "pending") {
    return false;
  }

  return previous.audio.src === audioSrc && hasInFlightSynthesisJob(projectPath, audioSrc);
}

async function buildSavedTts(
  serverEnv: ServerEnv,
  projectPath: string,
  pageId: string,
  plan: PlannedTts,
  forceResynthesis: boolean,
): Promise<{ tts: SavedTts; job?: SynthesisJob }> {
  if (plan.reuse !== "none" && plan.previous) {
    return { tts: createReusedSavedTts(plan.item, plan.previous) as SavedTts };
  }

  const voiceVersion = getOptionalVoiceVersion(plan.nextInput.voiceVersion);
  const planned = planProviderSynthesis(serverEnv, projectPath, plan.item.id, plan.nextInput);
  const cached = await readCachedWav(planned.wav);
  if (cached) {
    return {
      tts: createReadySavedTts(plan.item, plan.nextInput, cached, voiceVersion) as SavedTts,
    };
  }

  const tts = createPendingSavedTts(
    plan.item,
    plan.nextInput,
    planned.wav.audioSrc,
    voiceVersion,
  ) as SavedTts;
  if (shouldSkipPendingJob(projectPath, plan.previous, planned.wav.audioSrc, forceResynthesis)) {
    return { tts };
  }

  return {
    tts,
    job: {
      pageId,
      ttsId: plan.item.id,
      wav: planned.wav,
      run: planned.run,
    },
  };
}

async function planSavedPage(
  projectPath: string,
  page: SavePageItem,
  previousTtsById: Map<string, SavedTts>,
  nextPresets: VoicePreset[],
  previousPresets: VoicePreset[],
  forceResynthesis = false,
) {
  validatePage(page);
  const tts = await Promise.all(
    page.tts.map((item) =>
      planSavedTts(
        projectPath,
        item,
        previousTtsById.get(item.id),
        nextPresets,
        previousPresets,
        forceResynthesis,
      ),
    ),
  );

  return { page, tts };
}

async function buildSavedPage(
  serverEnv: ServerEnv,
  projectPath: string,
  planned: { page: SavePageItem; tts: PlannedTts[] },
  forceResynthesis: boolean,
): Promise<{ page: SavedPage; jobs: SynthesisJob[] }> {
  const built = await Promise.all(
    planned.tts.map((plan) =>
      buildSavedTts(serverEnv, projectPath, planned.page.id, plan, forceResynthesis),
    ),
  );
  const tts = built.map((item) => item.tts);
  const jobs = built.flatMap((item) => (item.job ? [item.job] : []));
  const page = planned.page;

  return {
    jobs,
    page: {
      id: page.id,
      title: page.title,
      type: page.type,
      meta: page.meta,
      padBeforeSec: page.padBeforeSec,
      padAfterSec: page.padAfterSec,
      durationSec: 0,
      richText: page.richText,
      tts,
    } as SavedPage,
  };
}

function buildSavedTransition(transition: SaveTransitionItem) {
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

function toSaveTtsItemFromSaved(item: SavedTts): SaveTtsItem {
  return {
    id: item.id,
    provider: item.provider,
    text: item.text,
    readText: item.readText,
    voiceName: item.voiceName,
    padBeforeSec: item.padBeforeSec,
    padAfterSec: item.padAfterSec,
    volume: item.volume,
    ...(item.voiceVersion ? { voiceVersion: item.voiceVersion } : {}),
    ...(item.synthesisSettings ? { synthesisSettings: item.synthesisSettings } : {}),
    ...(item.avatar ? { avatar: item.avatar } : {}),
    speech: item.speech.g2p ? { g2p: item.speech.g2p } : {},
  } as SaveTtsItem;
}

function toSavePageItemFromSaved(page: SavedPage): SavePageItem {
  const tts = page.tts.map(toSaveTtsItemFromSaved);
  if (page.type === "outro") {
    return {
      id: page.id,
      title: page.title,
      type: "outro",
      meta: page.meta,
      padBeforeSec: page.padBeforeSec,
      padAfterSec: page.padAfterSec,
      richText: page.richText,
      tts,
    };
  }

  if (page.type === "endcard") {
    return {
      id: page.id,
      title: page.title,
      type: "endcard",
      meta: page.meta,
      padBeforeSec: page.padBeforeSec,
      padAfterSec: page.padAfterSec,
      richText: page.richText,
      tts,
    };
  }

  return {
    id: page.id,
    title: page.title,
    type: page.type,
    meta: page.meta,
    padBeforeSec: page.padBeforeSec,
    padAfterSec: page.padAfterSec,
    richText: page.richText,
    tts,
  };
}

function pageNeedsResynthesisForPresets(
  page: SavedPage,
  previousPresets: VoicePreset[],
  nextPresets: VoicePreset[],
) {
  return page.tts.some((item) => {
    return (
      stableStringify(getEffectiveTtsSynthesisSettings(item, previousPresets)) !==
      stableStringify(getEffectiveTtsSynthesisSettings(item, nextPresets))
    );
  });
}

function resolveSequenceOrder(
  previous: SavedProject,
  itemsById: Map<string, SavedSequenceItem>,
  sequenceOrder: string[] | undefined,
) {
  const requested = sequenceOrder ?? previous.pages.map((item) => item.id);
  const nextOrder = requested.filter((itemId) => itemsById.has(itemId));
  for (const itemId of itemsById.keys()) {
    if (!nextOrder.includes(itemId)) {
      nextOrder.push(itemId);
    }
  }
  return nextOrder;
}

function getOptionalVoiceVersion(value: string) {
  return value || undefined;
}

export async function listProjects(): Promise<ProjectFileSummary[]> {
  return listSavedProjects();
}

export async function createProject(projectPath: string) {
  return createSavedProject(
    projectPath,
    savedProjectSchema.parse({
      meta: {
        ...getDefaultProjectMeta(getProjectFileStem(projectPath)),
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

async function saveProjectChangesLocked(
  serverEnv: ServerEnv,
  projectPath: string,
  request: SaveProjectChangesRequest,
) {
  const previousProject = await readSavedProject(projectPath);
  const itemsById = new Map(previousProject.pages.map((item) => [item.id, item]));
  const updatedItemIds: string[] = [];

  for (const itemId of request.removedItemIds) {
    itemsById.delete(itemId);
  }

  const nextPresets = request.project?.voicePresets ?? previousProject.voicePresets ?? [];
  const previousPresets = previousProject.voicePresets ?? [];
  const pagesToProcess = new Map<string, SavePageItem>();
  const forceResynthesis = Boolean(request.forceResynthesis);
  const presetsUnchanged = stableStringify(previousPresets) === stableStringify(nextPresets);

  for (const item of request.upsertItems) {
    if (isSaveTransitionItem(item)) {
      itemsById.set(item.id, buildSavedTransition(item));
      updatedItemIds.push(item.id);
      continue;
    }
    pagesToProcess.set(item.id, item);
  }

  if (forceResynthesis) {
    for (const [itemId, saved] of itemsById) {
      if (pagesToProcess.has(itemId) || !isSavedContentPage(saved)) {
        continue;
      }
      pagesToProcess.set(itemId, toSavePageItemFromSaved(saved));
    }
  } else if (request.project && !presetsUnchanged) {
    for (const [itemId, saved] of itemsById) {
      if (pagesToProcess.has(itemId) || !isSavedContentPage(saved)) {
        continue;
      }
      if (pageNeedsResynthesisForPresets(saved, previousPresets, nextPresets)) {
        pagesToProcess.set(itemId, toSavePageItemFromSaved(saved));
      }
    }
  }

  const previousTtsById = buildPreviousTtsMap(previousProject);
  const plannedPages = await Promise.all(
    [...pagesToProcess.values()].map((page) =>
      planSavedPage(
        projectPath,
        page,
        previousTtsById,
        nextPresets,
        previousPresets,
        forceResynthesis,
      ),
    ),
  );
  await assignBatchG2p(
    serverEnv,
    plannedPages.flatMap((planned) => planned.tts),
  );

  const jobs: SynthesisJob[] = [];
  for (const planned of plannedPages) {
    const built = await buildSavedPage(serverEnv, projectPath, planned, forceResynthesis);
    itemsById.set(built.page.id, built.page);
    jobs.push(...built.jobs);
    if (!updatedItemIds.includes(built.page.id)) {
      updatedItemIds.push(built.page.id);
    }
  }

  const sequenceOrder = resolveSequenceOrder(previousProject, itemsById, request.sequenceOrder);
  const assembled = sequenceOrder.flatMap((itemId) => {
    const item = itemsById.get(itemId);
    return item ? [item] : [];
  });
  validateSequenceItems(assembled);
  const pages = finalizeSequenceDurations(
    withSavedPageDurations(
      assembled,
      new Map(previousProject.pages.map((item) => [item.id, item])),
    ),
  );

  const meta = {
    ...normalizeProjectMeta(request.project?.meta ?? previousProject.meta, {
      titleFallback: getProjectFileStem(projectPath),
    }),
    updatedAt: nowIso(),
  };
  const project = savedProjectSchema.parse({
    meta,
    bgm: request.project?.bgm ?? previousProject.bgm,
    pages,
    voicePresets: nextPresets,
  });
  await writeSavedProject(projectPath, project);
  startSynthesisBatch(projectPath, jobs);
  return { project, updatedItemIds };
}

export async function saveProjectChanges(
  serverEnv: ServerEnv,
  projectPath: string,
  request: SaveProjectChangesRequest,
) {
  return enqueueProjectMutation(projectPath, () =>
    saveProjectChangesLocked(serverEnv, projectPath, request),
  );
}
