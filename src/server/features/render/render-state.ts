import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {
  LATEST_THUMBNAIL_PATH,
  LATEST_VIDEO_PATH,
  OUT_DIR,
  PROJECT_ROOT,
  getProjectOutputVideoPath,
  readSavedProject,
} from "@/server/_shared/storage";
import { parseRenderProgress, stripAnsi } from "./parse-render-progress";
import { thumbnailTimeToFrame } from "./render-thumbnail";
import { enqueueProjectMutation } from "@/server/features/project/project-mutation-queue";
import { projectHasPendingTts } from "@/_shared/lib/tts/tts-audio";

type RenderStatus = "idle" | "running" | "success" | "error" | "canceled";

export type RenderSnapshot = {
  status: RenderStatus;
  progress: number;
  videoPath: string | null;
  updatedAt: number;
  lastError: string | null;
};

const KILL_TIMEOUT_MS = 5_000;
const REMOTION_BIN = path.join(PROJECT_ROOT, "node_modules", ".bin", "remotion");

const state: RenderSnapshot = {
  status: "idle",
  progress: 0,
  videoPath: null,
  updatedAt: Date.now(),
  lastError: null,
};

const listeners = new Set<(snapshot: RenderSnapshot) => void>();
let activeChild: ChildProcess | null = null;
let cancelRequested = false;
let killTimer: ReturnType<typeof setTimeout> | null = null;
let startReserved = false;

function emit() {
  state.updatedAt = Date.now();
  const snapshot = getRenderSnapshot();
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function getRenderSnapshot(): RenderSnapshot {
  return {
    status: state.status,
    progress: state.progress,
    videoPath: state.videoPath,
    updatedAt: state.updatedAt,
    lastError: state.lastError,
  };
}

export function subscribeRender(listener: (snapshot: RenderSnapshot) => void) {
  listeners.add(listener);
  listener(getRenderSnapshot());

  return () => {
    listeners.delete(listener);
  };
}

export function readRenderSnapshot() {
  return getRenderSnapshot();
}

function resetRenderState() {
  state.progress = 0;
  state.videoPath = null;
  state.lastError = null;
}

function isRenderStartBlocked() {
  return startReserved || state.status === "running";
}

export function resetRenderStateForTests() {
  startReserved = false;
  cancelRequested = false;
  activeChild = null;
  clearKillTimer();
  state.status = "idle";
  state.progress = 0;
  state.videoPath = null;
  state.lastError = null;
}

function setProgress(next: number) {
  const progress = Math.min(100, Math.max(0, Math.round(next)));
  if (progress <= state.progress) {
    return;
  }

  state.progress = progress;
  emit();
}

function clearKillTimer() {
  if (!killTimer) {
    return;
  }

  clearTimeout(killTimer);
  killTimer = null;
}

function stopChild(signal: NodeJS.Signals) {
  const child = activeChild;
  if (!child?.pid) {
    return;
  }

  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function handleOutputLine(line: string, progressScale = 1) {
  const cleaned = stripAnsi(line).replaceAll("\r", "").trim();
  if (!cleaned) {
    return;
  }

  console.info("[render]", cleaned);
  const parsed = parseRenderProgress(cleaned);
  if (parsed !== null) {
    setProgress(parsed * progressScale);
  }
}

function pipeOutput(stream: NodeJS.ReadableStream | null, onLine: (line: string) => void) {
  if (!stream) {
    return;
  }

  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += String(chunk);
    const lines = buffer.split(/\r|\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      onLine(line);
    }
  });
  stream.on("end", () => {
    if (buffer) {
      onLine(buffer);
    }
  });
}

function finishCanceledRender() {
  cancelRequested = false;
  state.status = "canceled";
  state.lastError = null;
  console.info("[render]", "Render canceled.");
  emit();
}

function finishFailedRender(message: string) {
  state.status = "error";
  state.lastError = message;
  console.info("[render]", message);
  emit();
}

async function finishSuccessfulRender(outputPath: string) {
  try {
    if (outputPath !== LATEST_VIDEO_PATH) {
      await fs.copyFile(outputPath, LATEST_VIDEO_PATH);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.info("[render]", `Failed to update latest.mp4: ${message}`);
  }
  state.status = "success";
  state.progress = 100;
  state.videoPath = "/api/render/video";
  console.info("[render]", "Render and thumbnail completed.");
  emit();
}

export async function startRender(projectPath: string) {
  return enqueueProjectMutation(projectPath, async () => {
    if (isRenderStartBlocked()) {
      return {
        started: false as const,
        reason: "already_running" as const,
      };
    }

    startReserved = true;
    try {
      const project = await readSavedProject(projectPath);
      if (projectHasPendingTts(project)) {
        return {
          started: false as const,
          reason: "tts_pending" as const,
        };
      }

      await fs.mkdir(OUT_DIR, { recursive: true });
      await fs.rm(LATEST_THUMBNAIL_PATH, { force: true });
      const outputPath = getProjectOutputVideoPath(projectPath);
      const inputProps = JSON.stringify({ project });
      resetRenderState();
      cancelRequested = false;
      state.status = "running";
      emit();
      console.info("[render]", `Starting render for ${projectPath}...`);

      const child = spawn(
        REMOTION_BIN,
        ["render", "src/remotion/core/runtime.ts", "Video", outputPath, "--props", inputProps],
        {
          cwd: PROJECT_ROOT,
          detached: true,
          env: process.env,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      activeChild = child;

      pipeOutput(child.stdout, (line) => handleOutputLine(line, 0.9));
      pipeOutput(child.stderr, (line) => handleOutputLine(line, 0.9));

      child.on("error", (error) => {
        if (state.status !== "running") {
          return;
        }

        state.status = "error";
        state.lastError = error.message;
        console.info("[render]", `Render process error: ${error.message}`);
        emit();
      });

      child.on("close", async (code) => {
        clearKillTimer();
        activeChild = null;

        if (cancelRequested) {
          finishCanceledRender();
          return;
        }

        if (code === 0) {
          let thumbnailFrame: number;
          try {
            thumbnailFrame = thumbnailTimeToFrame(project.meta.niconico.thumbnailTime);
          } catch (error) {
            finishFailedRender(error instanceof Error ? error.message : String(error));
            return;
          }
          setProgress(95);
          console.info("[render]", `Rendering thumbnail.png at frame ${thumbnailFrame}...`);
          const thumbnailChild = spawn(
            REMOTION_BIN,
            [
              "still",
              "src/remotion/core/runtime.ts",
              "Video",
              LATEST_THUMBNAIL_PATH,
              "--frame",
              String(thumbnailFrame),
              "--props",
              inputProps,
              "--overwrite",
            ],
            {
              cwd: PROJECT_ROOT,
              detached: true,
              env: process.env,
              stdio: ["ignore", "pipe", "pipe"],
            },
          );
          activeChild = thumbnailChild;
          pipeOutput(thumbnailChild.stdout, handleOutputLine);
          pipeOutput(thumbnailChild.stderr, handleOutputLine);
          thumbnailChild.on("error", (error) => {
            if (state.status === "running") {
              finishFailedRender(`Thumbnail process error: ${error.message}`);
            }
          });
          thumbnailChild.on("close", async (thumbnailCode) => {
            clearKillTimer();
            activeChild = null;
            if (cancelRequested) {
              finishCanceledRender();
            } else if (state.status !== "running") {
              return;
            } else if (thumbnailCode === 0) {
              await finishSuccessfulRender(outputPath);
            } else {
              finishFailedRender(`Thumbnail render exited with code ${thumbnailCode ?? "unknown"}`);
            }
          });
          return;
        }

        finishFailedRender(`Render exited with code ${code ?? "unknown"}`);
      });

      return {
        started: true as const,
      };
    } finally {
      startReserved = false;
    }
  });
}

export function cancelRender() {
  if (state.status !== "running" || !activeChild?.pid) {
    return {
      canceled: false as const,
      reason: "not_running",
    };
  }

  cancelRequested = true;
  stopChild("SIGTERM");
  clearKillTimer();
  killTimer = setTimeout(() => {
    stopChild("SIGKILL");
  }, KILL_TIMEOUT_MS);
  console.info("[render]", "Cancel requested.");

  return {
    canceled: true as const,
  };
}
