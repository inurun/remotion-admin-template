import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {
  LATEST_VIDEO_PATH,
  OUT_DIR,
  PROJECT_ROOT,
  getProjectOutputVideoPath,
  readSavedProject,
} from "@/server/_shared/storage";
import { parseRenderProgress, stripAnsi } from "./parse-render-progress";

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

function setProgress(next: number) {
  if (next <= state.progress) {
    return;
  }

  state.progress = next;
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

function handleOutputLine(line: string) {
  const cleaned = stripAnsi(line).replaceAll("\r", "").trim();
  if (!cleaned) {
    return;
  }

  console.info("[render]", cleaned);
  const parsed = parseRenderProgress(cleaned);
  if (parsed !== null) {
    setProgress(parsed);
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

export async function startRender(projectPath: string) {
  if (state.status === "running") {
    return {
      started: false as const,
      reason: "already_running",
    };
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const project = await readSavedProject(projectPath);
  const outputPath = getProjectOutputVideoPath(projectPath);
  resetRenderState();
  cancelRequested = false;
  state.status = "running";
  emit();
  console.info("[render]", `Starting render for ${projectPath}...`);

  const child = spawn(
    REMOTION_BIN,
    [
      "render",
      "src/remotion/core/runtime.ts",
      "Video",
      outputPath,
      "--props",
      JSON.stringify({ project }),
    ],
    {
      cwd: PROJECT_ROOT,
      detached: true,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  activeChild = child;

  pipeOutput(child.stdout, handleOutputLine);
  pipeOutput(child.stderr, handleOutputLine);

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
      cancelRequested = false;
      state.status = "canceled";
      state.lastError = null;
      console.info("[render]", "Render canceled.");
      emit();
      return;
    }

    if (code === 0) {
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
      console.info("[render]", "Render completed.");
      emit();
      return;
    }

    state.status = "error";
    state.lastError = `Render exited with code ${code ?? "unknown"}`;
    console.info("[render]", state.lastError);
    emit();
  });

  return {
    started: true as const,
  };
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
