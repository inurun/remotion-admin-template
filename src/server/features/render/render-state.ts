import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {
  OUT_DIR,
  PROJECT_ROOT,
  RENDER_STATE_PATH,
  readSavedProject,
} from "@/server/_shared/storage";

type RenderStatus = "idle" | "running" | "success" | "error";

export type RenderSnapshot = {
  status: RenderStatus;
  logs: string[];
  videoPath: string | null;
  updatedAt: number;
  lastError: string | null;
};

const MAX_LOGS = 500;
const state: RenderSnapshot = {
  status: "idle",
  logs: [],
  videoPath: null,
  updatedAt: Date.now(),
  lastError: null,
};

const listeners = new Set<(snapshot: RenderSnapshot) => void>();

async function persist() {
  await fs.mkdir(path.dirname(RENDER_STATE_PATH), { recursive: true });
  await fs.writeFile(RENDER_STATE_PATH, JSON.stringify(getRenderSnapshot(), null, 2));
}

function emit() {
  state.updatedAt = Date.now();
  const snapshot = getRenderSnapshot();
  for (const listener of listeners) {
    listener(snapshot);
  }

  void persist();
}

function appendLog(line: string) {
  const trimmed = line.replace(/\r/g, "");
  if (!trimmed) {
    return;
  }

  state.logs.push(trimmed);
  if (state.logs.length > MAX_LOGS) {
    state.logs.splice(0, state.logs.length - MAX_LOGS);
  }
  emit();
}

function getRenderSnapshot(): RenderSnapshot {
  return {
    status: state.status,
    logs: [...state.logs],
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

export async function readRenderSnapshot() {
  try {
    const content = await fs.readFile(RENDER_STATE_PATH, "utf8");
    return JSON.parse(content) as RenderSnapshot;
  } catch {
    return getRenderSnapshot();
  }
}

function resetRenderState() {
  state.logs = [];
  state.videoPath = null;
  state.lastError = null;
}

function pipeOutput(stream: NodeJS.ReadableStream | null, onLine: (line: string) => void) {
  if (!stream) {
    return;
  }

  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += String(chunk);
    const lines = buffer.split("\n");
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
  resetRenderState();
  state.status = "running";
  appendLog(`Starting render for ${projectPath}...`);

  const child = spawn(
    "pnpm",
    [
      "exec",
      "remotion",
      "render",
      "src/remotion/core/runtime.ts",
      "Video",
      `${OUT_DIR}/${project.meta.title}.mp4`,
      "--props",
      JSON.stringify({ project }),
    ],
    {
      cwd: PROJECT_ROOT,
      env: process.env,
    },
  );

  pipeOutput(child.stdout, (line) => appendLog(line));
  pipeOutput(child.stderr, (line) => appendLog(line));

  child.on("error", (error) => {
    state.status = "error";
    state.lastError = error.message;
    appendLog(`Render process error: ${error.message}`);
  });

  child.on("close", async (code) => {
    if (code === 0) {
      state.status = "success";
      state.videoPath = "/api/render/video";
      appendLog("Render completed.");
      emit();
      return;
    }

    state.status = "error";
    state.lastError = `Render exited with code ${code ?? "unknown"}`;
    appendLog(state.lastError);
    emit();
  });

  return {
    started: true as const,
  };
}
