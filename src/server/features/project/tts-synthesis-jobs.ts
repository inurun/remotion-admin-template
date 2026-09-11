import {
  isSavedContentPage,
  savedProjectSchema,
  type SavedProject,
  type SavedTts,
} from "@/_schemas";
import { getErrorMessage } from "@/_shared/lib/error-message";
import { readSavedProject, writeSavedProject } from "@/server/_shared/storage";
import type { SynthesizeResponse } from "@/server/features/tts/contract";
import type { PlannedWav } from "@/server/features/tts/wav-cache";
import { AUDIO_PADDING_SECONDS, withSettledPageDurations } from "./page-duration";
import { enqueueProjectMutation } from "./project-mutation-queue";

const SYNTHESIS_ERROR_MAX_LENGTH = 500;
const inFlightJobs = new Map<string, Promise<SynthesizeResponse>>();
const pendingBatches = new Set<Promise<void>>();

export type SynthesisJob = {
  pageId: string;
  ttsId: string;
  wav: PlannedWav;
  run: () => Promise<SynthesizeResponse>;
};

type SynthesisJobResult =
  | {
      pageId: string;
      ttsId: string;
      audioSrc: string;
      ok: true;
      result: SynthesizeResponse;
    }
  | {
      pageId: string;
      ttsId: string;
      audioSrc: string;
      ok: false;
      error: string;
    };

function jobKey(projectPath: string, audioSrc: string) {
  return `${projectPath}\0${audioSrc}`;
}

export function hasInFlightSynthesisJob(projectPath: string, audioSrc: string) {
  return inFlightJobs.has(jobKey(projectPath, audioSrc));
}

function sanitizeSynthesisError(error: unknown) {
  const message = getErrorMessage(error, "Synthesis failed").replace(/\s+/g, " ").trim();
  if (message.length <= SYNTHESIS_ERROR_MAX_LENGTH) {
    return message || "Synthesis failed";
  }
  return `${message.slice(0, SYNTHESIS_ERROR_MAX_LENGTH - 1)}…`;
}

function registerSynthesisJob(
  projectPath: string,
  audioSrc: string,
  run: () => Promise<SynthesizeResponse>,
) {
  const key = jobKey(projectPath, audioSrc);
  const existing = inFlightJobs.get(key);
  if (existing) {
    return existing;
  }

  const task = Promise.resolve()
    .then(run)
    .finally(() => {
      if (inFlightJobs.get(key) === task) {
        inFlightJobs.delete(key);
      }
    });
  inFlightJobs.set(key, task);
  return task;
}

function patchSavedTts(item: SavedTts, result: SynthesisJobResult): SavedTts | null {
  if (item.audio.status !== "pending" || item.audio.src !== result.audioSrc) {
    return null;
  }

  if (result.ok) {
    return {
      ...item,
      audio: {
        status: "ready",
        src: result.audioSrc,
        durationSec: result.result.durationSec + AUDIO_PADDING_SECONDS,
      },
    };
  }

  return {
    ...item,
    audio: {
      status: "failed",
      src: result.audioSrc,
      error: result.error,
    },
  };
}

export function patchProjectWithSynthesisResults(
  project: SavedProject,
  results: SynthesisJobResult[],
) {
  const resultsByTtsId = new Map(results.map((result) => [result.ttsId, result]));
  const affectedPageIds = new Set<string>();

  const pages = project.pages.map((page) => {
    if (!isSavedContentPage(page)) {
      return page;
    }

    let changed = false;
    const tts = page.tts.map((item) => {
      const result = resultsByTtsId.get(item.id);
      if (!result || result.pageId !== page.id) {
        return item;
      }
      const next = patchSavedTts(item, result);
      if (!next) {
        return item;
      }
      changed = true;
      return next;
    });

    if (!changed) {
      return page;
    }

    affectedPageIds.add(page.id);
    return { ...page, tts };
  });

  return savedProjectSchema.parse({
    ...project,
    pages: withSettledPageDurations(pages, affectedPageIds),
  });
}

async function applySynthesisBatch(projectPath: string, results: SynthesisJobResult[]) {
  if (results.length === 0) {
    return;
  }

  const project = await readSavedProject(projectPath);
  const next = patchProjectWithSynthesisResults(project, results);
  await writeSavedProject(projectPath, next);
}

export function startSynthesisBatch(projectPath: string, jobs: SynthesisJob[]) {
  if (jobs.length === 0) {
    return;
  }

  const tracked = jobs.map((job) =>
    registerSynthesisJob(projectPath, job.wav.audioSrc, job.run).then(
      (result) =>
        ({
          pageId: job.pageId,
          ttsId: job.ttsId,
          audioSrc: job.wav.audioSrc,
          ok: true,
          result,
        }) satisfies SynthesisJobResult,
      (error: unknown) =>
        ({
          pageId: job.pageId,
          ttsId: job.ttsId,
          audioSrc: job.wav.audioSrc,
          ok: false,
          error: sanitizeSynthesisError(error),
        }) satisfies SynthesisJobResult,
    ),
  );

  const batch = Promise.all(tracked)
    .then((results) =>
      enqueueProjectMutation(projectPath, () => applySynthesisBatch(projectPath, results)),
    )
    .catch((error: unknown) => {
      console.error("[tts-synthesis]", error);
    })
    .then(() => undefined);

  pendingBatches.add(batch);
  void batch.finally(() => {
    pendingBatches.delete(batch);
  });
}

export async function flushSynthesisJobsForTests() {
  await Promise.all(pendingBatches);
}

export function resetSynthesisJobsForTests() {
  inFlightJobs.clear();
  pendingBatches.clear();
}
