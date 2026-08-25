import { execFile, spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createOpencode } from "@opencode-ai/sdk/v2";
import { nowIso, toIso } from "@/_shared/lib/date";
import { PROJECT_ROOT } from "@/server/_shared/storage";
import { extractNiconicoVideoId } from "@/_shared/project/project-meta";
import { toNiconicoDescriptionHtml } from "./niconico-description-html";
import {
  normalizeLogMessage,
  type VerifiedPublishPrepResult,
  validatePublishPrepResult,
} from "./niconico-publish";

export type PublishPrepJobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export type PublishPrepJobResult = VerifiedPublishPrepResult;

export type PublishPrepJob = {
  id: string;
  status: PublishPrepJobStatus;
  logs: string[];
  logPath: string;
  result?: PublishPrepJobResult;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

type PublishPrepJobStore = Map<string, PublishPrepJob>;

type OpenCodeInstance = Awaited<ReturnType<typeof createOpencode>>;

type PublishPrepJobRuntime = {
  controller: AbortController;
  opencode?: OpenCodeInstance;
  sessionId?: string;
  lastLogByKey: Map<string, string>;
};

type PublishPrepJobRuntimeStore = Map<string, PublishPrepJobRuntime>;

type VideoMeta = {
  title: string;
  description: string;
  thumbnailTime: string;
};

type ParentWork = {
  title: string;
  url: string;
};

const STORE_KEY = "__niconicoPublishPrepJobs";
const RUNTIME_STORE_KEY = "__niconicoPublishPrepJobRuntimes";
const JOB_LISTENERS_KEY = "__niconicoPublishPrepJobListeners";
const NICONICO_UPLOAD_URL = "https://garage.nicovideo.jp/niconico-garage/video/videos/upload";
const ALLOWED_DOMAINS = "*";
const AGENT_BROWSER_SESSION = "niconico-publish";
const NICONICO_CHROME_CDP_PORT = 9222;
const NICONICO_CHROME_READY_TIMEOUT_MS = 15_000;
const execFileAsync = promisify(execFile);
const DEFAULT_CHROME_EXECUTABLE_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
];
const THUMBNAIL_TIME_PATTERN = /^\d{2}:[0-5]\d\.\d{3}$/;
const DEFAULT_MAX_PUBLISH_LOG_FILES = 50;

function getPublishPrepLogDir(): string {
  const configured = process.env.NICONICO_PUBLISH_LOG_DIR?.trim();
  return configured
    ? path.resolve(process.cwd(), configured)
    : path.resolve(process.cwd(), ".logs/niconico-publish");
}

function createPublishPrepLogPath(jobId: string, createdAt: number): string {
  const timestamp = toIso(createdAt).replace(/[:.]/g, "-");
  const logDir = getPublishPrepLogDir();
  mkdirSync(logDir, { recursive: true });
  return path.join(logDir, `${timestamp}_${jobId}.log`);
}

function getMaxPublishLogFiles(): number {
  const configured = Number(process.env.NICONICO_PUBLISH_LOG_MAX_FILES);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_PUBLISH_LOG_FILES;
}

async function prunePublishPrepLogs(currentLogPath: string) {
  try {
    const logDir = path.dirname(currentLogPath);
    const filenames = (await fs.readdir(logDir))
      .filter((filename) => filename.endsWith(".log"))
      .sort();
    const staleFilenames = filenames.slice(
      0,
      Math.max(0, filenames.length - getMaxPublishLogFiles()),
    );
    await Promise.all(
      staleFilenames
        .filter((filename) => path.join(logDir, filename) !== currentLogPath)
        .map((filename) => fs.unlink(path.join(logDir, filename))),
    );
  } catch (error) {
    console.error(`[niconico] Failed to prune publish logs: ${stringifyForLog(error)}`);
  }
}

function getJobStore(): PublishPrepJobStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: PublishPrepJobStore;
  };
  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = new Map();
  }
  return globalStore[STORE_KEY];
}

function getJobRuntimeStore(): PublishPrepJobRuntimeStore {
  const globalStore = globalThis as typeof globalThis & {
    [RUNTIME_STORE_KEY]?: PublishPrepJobRuntimeStore;
  };
  if (!globalStore[RUNTIME_STORE_KEY]) {
    globalStore[RUNTIME_STORE_KEY] = new Map();
  }
  return globalStore[RUNTIME_STORE_KEY];
}

function getActivePublishPrepJob(): PublishPrepJob | undefined {
  const jobs = getJobStore();
  for (const jobId of getJobRuntimeStore().keys()) {
    const job = jobs.get(jobId);
    if (job) return job;
  }
  return [...jobs.values()].find((job) => job.status === "queued" || job.status === "running");
}

function getJobListeners() {
  const globalStore = globalThis as typeof globalThis & {
    [JOB_LISTENERS_KEY]?: Set<(job: PublishPrepJob) => void>;
  };
  if (!globalStore[JOB_LISTENERS_KEY]) {
    globalStore[JOB_LISTENERS_KEY] = new Set();
  }
  return globalStore[JOB_LISTENERS_KEY];
}

function emitJob(job: PublishPrepJob) {
  for (const listener of getJobListeners()) {
    listener(job);
  }
}

export function subscribePublishPrepJob(listener: (job: PublishPrepJob) => void) {
  getJobListeners().add(listener);
  return () => {
    getJobListeners().delete(listener);
  };
}

function updateJob(job: PublishPrepJob, patch: Partial<PublishPrepJob>) {
  Object.assign(job, patch, { updatedAt: Date.now() });
  emitJob(job);
}

function pushLog(
  job: PublishPrepJob,
  message: string,
  options: { dedupeKey?: string; level?: "INFO" | "WARN" | "ERROR" } = {},
) {
  const normalizedMessage = normalizeLogMessage(message);
  const runtime = getJobRuntimeStore().get(job.id);
  if (options.dedupeKey && runtime) {
    if (runtime.lastLogByKey.get(options.dedupeKey) === normalizedMessage) {
      return;
    }
    runtime.lastLogByKey.set(options.dedupeKey, normalizedMessage);
  }
  const level = options.level ?? "INFO";
  const line = `[${nowIso()}] [${level}] ${normalizedMessage}`;
  job.logs.push(line);
  if (job.logs.length > 500) {
    job.logs.splice(0, job.logs.length - 500);
  }
  job.updatedAt = Date.now();
  try {
    appendFileSync(job.logPath, `${line}\n`, "utf-8");
  } catch (error) {
    console.error(`[niconico:${job.id}] Failed to persist job log: ${stringifyForLog(error)}`);
  }
  const logLine = `[niconico:${job.id}] ${normalizedMessage}`;
  if (level === "ERROR" || /error|failed|denied|reject/i.test(message)) {
    console.error(logLine);
  } else if (level === "WARN") {
    console.warn(logLine);
  } else {
    console.log(logLine);
  }
  emitJob(job);
}

function assertVideoMeta(value: unknown): VideoMeta {
  if (!value || typeof value !== "object") {
    throw new Error("videoMeta is required");
  }
  const candidate = value as Partial<VideoMeta>;
  if (typeof candidate.title !== "string" || !candidate.title.trim()) {
    throw new Error("videoMeta.title is required");
  }
  if (typeof candidate.description !== "string" || !candidate.description.trim()) {
    throw new Error("videoMeta.description is required");
  }
  if (
    typeof candidate.thumbnailTime !== "string" ||
    !THUMBNAIL_TIME_PATTERN.test(candidate.thumbnailTime)
  ) {
    throw new Error("videoMeta.thumbnailTime must be MM:SS.mmm");
  }
  return {
    title: candidate.title,
    description: candidate.description,
    thumbnailTime: candidate.thumbnailTime,
  };
}

function getRootDir(): string {
  return PROJECT_ROOT;
}

function getUploadProcedurePath(): string {
  return path.resolve(
    PROJECT_ROOT,
    "src/server/features/publish/prompts/niconico-upload-procedure.md",
  );
}

function getProfileDir(): string {
  return path.resolve(PROJECT_ROOT, ".agent-browser/niconico-profile");
}

function getAgentBrowserHomeDir(): string {
  return path.resolve(PROJECT_ROOT, ".agent-browser/home");
}

function getAgentBrowserStateDir(): string {
  return path.join(os.homedir(), ".agent-browser");
}

function getOpenCodeInternalLogDir(): string {
  return path.join(os.homedir(), ".local/share/opencode/log");
}

async function findLatestOpenCodeLogPath(): Promise<string | undefined> {
  try {
    const filenames = (await fs.readdir(getOpenCodeInternalLogDir()))
      .filter((filename) => filename.endsWith(".log"))
      .sort();
    const latest = filenames.at(-1);
    return latest ? path.join(getOpenCodeInternalLogDir(), latest) : undefined;
  } catch {
    return undefined;
  }
}

function getChromeWritableDirs(): string[] {
  const appSupportDir = path.join(os.homedir(), "Library/Application Support");
  return [
    path.join(appSupportDir, "Google/Chrome for Testing"),
    path.join(appSupportDir, "Google/Chrome"),
  ];
}

function getOpenCodePort(): number {
  const value = process.env.OPENCODE_PORT;
  if (!value) return 4096;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 4096;
}

function getOpenCodePromptHardTimeoutMs(): number {
  const value =
    process.env.OPENCODE_PROMPT_HARD_TIMEOUT_MS ?? process.env.OPENCODE_PROMPT_TIMEOUT_MS;
  if (!value) return 1_200_000;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1_200_000;
}

function getOpenCodePromptInactivityTimeoutMs(): number {
  const value = process.env.OPENCODE_PROMPT_INACTIVITY_TIMEOUT_MS;
  if (!value) return 180_000;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 180_000;
}

function getOpenCodeMaxRetryAttempts(): number {
  const value = process.env.OPENCODE_MAX_RETRY_ATTEMPTS;
  if (!value) return 3;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 3;
}

function shouldUseOpenCodeStructuredOutput(): boolean {
  return process.env.OPENCODE_USE_STRUCTURED_OUTPUT === "1";
}

function getAgentBrowserCliPrefix(rootDir: string): string {
  return `pnpm --dir ${rootDir} exec agent-browser --session "${AGENT_BROWSER_SESSION}" --cdp ${NICONICO_CHROME_CDP_PORT}`;
}

function getOpenCodeConfig(rootDir: string) {
  const agentBrowserCommand = `pnpm --dir ${rootDir} exec agent-browser *`;
  const legacyAgentBrowserCommand = "pnpm exec agent-browser *";
  const model = process.env.OPENCODE_MODEL?.trim();
  const agentConfig = {
    tools: {
      bash: true,
      invalid: true,
      question: false,
      read: false,
      glob: false,
      grep: false,
      task: false,
      webfetch: false,
      websearch: false,
      todowrite: false,
      skill: false,
      edit: false,
      write: false,
      patch: false,
    },
    permission: {
      edit: "deny" as const,
      external_directory: "deny" as const,
      bash: {
        [agentBrowserCommand]: "allow" as const,
        [legacyAgentBrowserCommand]: "allow" as const,
        "*": "deny" as const,
      },
    },
  };
  return {
    ...(model ? { model } : {}),
    share: "disabled" as const,
    tools: {
      bash: true,
      edit: false,
      write: false,
      patch: false,
    },
    permission: {
      edit: "deny" as const,
      external_directory: "deny" as const,
      bash: {
        [agentBrowserCommand]: "allow" as const,
        [legacyAgentBrowserCommand]: "allow" as const,
        "*": "deny" as const,
      },
    },
    agent: {
      build: agentConfig,
      general: agentConfig,
    },
  };
}

function isCdpPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      resolve(false);
    });
  });
}

async function waitForCdpPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isCdpPortListening(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Niconico Chrome CDP port ${port} did not become ready`);
}

async function ensureNiconicoChrome() {
  if (await isCdpPortListening(NICONICO_CHROME_CDP_PORT)) return;
  const executablePath = await resolveAgentBrowserExecutablePath();
  if (!executablePath) {
    throw new Error("Google Chrome is required for Niconico publish");
  }
  const child = spawn(
    executablePath,
    [
      `--user-data-dir=${getProfileDir()}`,
      `--remote-debugging-port=${NICONICO_CHROME_CDP_PORT}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--noerrdialogs",
      NICONICO_UPLOAD_URL,
    ],
    {
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();
  await waitForCdpPort(NICONICO_CHROME_CDP_PORT, NICONICO_CHROME_READY_TIMEOUT_MS);
}

async function attachAgentBrowserToNiconicoChrome() {
  await execFileAsync(
    "pnpm",
    [
      "--dir",
      getRootDir(),
      "exec",
      "agent-browser",
      "--session",
      AGENT_BROWSER_SESSION,
      "--cdp",
      String(NICONICO_CHROME_CDP_PORT),
      "get",
      "url",
    ],
    {
      cwd: getRootDir(),
      env: await getAgentBrowserEnv(),
      timeout: 15_000,
    },
  );
}

async function getAgentBrowserEnv(): Promise<Record<string, string>> {
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

  const agentBrowserEnv: Record<string, string> = {
    ...env,
    HOME: process.env.HOME ?? os.homedir(),
    AGENT_BROWSER_SESSION,
    AGENT_BROWSER_CDP: String(NICONICO_CHROME_CDP_PORT),
  };
  delete agentBrowserEnv.AGENT_BROWSER_SESSION_NAME;
  delete agentBrowserEnv.AGENT_BROWSER_PROFILE;
  delete agentBrowserEnv.AGENT_BROWSER_EXECUTABLE_PATH;
  delete agentBrowserEnv.AGENT_BROWSER_HEADED;
  delete agentBrowserEnv.AGENT_BROWSER_ARGS;
  if (ALLOWED_DOMAINS !== "*") {
    agentBrowserEnv.AGENT_BROWSER_ALLOWED_DOMAINS = ALLOWED_DOMAINS;
  }
  return agentBrowserEnv;
}

async function ensureBrowserWritableDirs() {
  const dirs = [
    getProfileDir(),
    getAgentBrowserHomeDir(),
    getAgentBrowserStateDir(),
    ...getChromeWritableDirs(),
  ];
  await Promise.all(dirs.map((dir) => fs.mkdir(dir, { recursive: true })));
}

async function resolveAgentBrowserExecutablePath(): Promise<string | undefined> {
  if (process.env.AGENT_BROWSER_EXECUTABLE_PATH) {
    return process.env.AGENT_BROWSER_EXECUTABLE_PATH;
  }

  for (const candidate of DEFAULT_CHROME_EXECUTABLE_PATHS) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next installed Chrome channel.
    }
  }

  return undefined;
}

function parseResult(value: unknown): PublishPrepJobResult {
  if (!value || typeof value !== "object") {
    return {
      url: "",
      title: "",
      finalResponse: String(value ?? ""),
      reachedConfirmation: false,
      finalSubmitClicked: false,
      actualVideoTitle: "",
      actualThumbnailTime: "",
      registeredParentWorkIds: [],
    };
  }
  const parsed = value as Partial<PublishPrepJobResult>;
  return {
    url: typeof parsed.url === "string" ? parsed.url : "",
    title: typeof parsed.title === "string" ? parsed.title : "",
    finalResponse: typeof parsed.finalResponse === "string" ? parsed.finalResponse : "",
    videoPath: typeof parsed.videoPath === "string" ? parsed.videoPath : undefined,
    reachedConfirmation: parsed.reachedConfirmation === true,
    finalSubmitClicked: parsed.finalSubmitClicked === true,
    actualVideoTitle: typeof parsed.actualVideoTitle === "string" ? parsed.actualVideoTitle : "",
    actualThumbnailTime:
      typeof parsed.actualThumbnailTime === "string" ? parsed.actualThumbnailTime : "",
    registeredParentWorkIds: Array.isArray(parsed.registeredParentWorkIds)
      ? parsed.registeredParentWorkIds.filter((id): id is string => typeof id === "string")
      : [],
  };
}

function parseResultText(text: string): PublishPrepJobResult {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fenced?.[1] ?? trimmed;
  try {
    return parseResult(JSON.parse(jsonText));
  } catch {
    const firstBrace = jsonText.indexOf("{");
    const lastBrace = jsonText.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return parseResult(JSON.parse(jsonText.slice(firstBrace, lastBrace + 1)));
      } catch {
        // Fall through to raw response below.
      }
    }
    return {
      url: "",
      title: "",
      finalResponse: text,
      reachedConfirmation: false,
      finalSubmitClicked: false,
      actualVideoTitle: "",
      actualThumbnailTime: "",
      registeredParentWorkIds: [],
    };
  }
}

function formatMessageParts(parts: unknown[]): string {
  return parts
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const candidate = part as {
        type?: unknown;
        text?: unknown;
      };
      if (candidate.type === "text" && typeof candidate.text === "string") {
        return candidate.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function stringifyForLog(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  }
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function logOpenCodeToolIds(
  job: PublishPrepJob,
  opencode: Awaited<ReturnType<typeof createOpencode>>,
  rootDir: string,
) {
  try {
    const result = await opencode.client.tool.ids({ directory: rootDir });
    if (result.error) {
      pushLog(job, `OpenCode tool ids failed: ${stringifyForLog(result.error)}`);
      return;
    }
    pushLog(job, `OpenCode tool ids: ${result.data.join(", ")}`);
  } catch (error) {
    pushLog(job, `OpenCode tool ids failed: ${stringifyForLog(error)}`);
  }
}

function eventSessionId(event: unknown): string | undefined {
  if (!event || typeof event !== "object") return undefined;
  const candidate = event as {
    properties?: {
      sessionID?: unknown;
      info?: { sessionID?: unknown };
      part?: { sessionID?: unknown };
    };
  };
  const direct = candidate.properties?.sessionID;
  if (typeof direct === "string") return direct;
  const info = candidate.properties?.info?.sessionID;
  if (typeof info === "string") return info;
  const part = candidate.properties?.part?.sessionID;
  if (typeof part === "string") return part;
  return undefined;
}

type FormattedOpenCodeLog = {
  message: string;
  dedupeKey?: string;
  level?: "INFO" | "WARN" | "ERROR";
};

function formatOpenCodePart(part: unknown): FormattedOpenCodeLog | null {
  if (!part || typeof part !== "object") return null;
  const candidate = part as {
    id?: unknown;
    type?: unknown;
    text?: unknown;
    tool?: unknown;
    state?: {
      status?: unknown;
      title?: unknown;
      input?: unknown;
      output?: unknown;
      error?: unknown;
    };
  };

  if (candidate.type === "text" && typeof candidate.text === "string") {
    if (process.env.OPENCODE_DEBUG_VERBOSE !== "1") return null;
    return {
      message: `OpenCode message: ${candidate.text.slice(-1000)}`,
      dedupeKey: `text:${String(candidate.id ?? "unknown")}`,
    };
  }
  if (candidate.type !== "tool") return null;

  const tool = typeof candidate.tool === "string" ? candidate.tool : "tool";
  const status = typeof candidate.state?.status === "string" ? candidate.state.status : "unknown";
  if (
    process.env.OPENCODE_DEBUG_VERBOSE !== "1" &&
    (status === "pending" || status === "running")
  ) {
    return null;
  }
  const title = typeof candidate.state?.title === "string" ? candidate.state.title : "";
  const rawOutput =
    typeof candidate.state?.output === "string"
      ? candidate.state.output
          .replace(/⚠ --executable-path ignored: daemon already running\.[^\n]*\n?/g, "")
          .trim()
      : "";
  const error =
    typeof candidate.state?.error === "string"
      ? ` error=${candidate.state.error.slice(-1500)}`
      : "";
  const failed =
    status === "error" ||
    Boolean(error) ||
    /(?:Unknown command|Evaluation error|ERR_PNPM|exited with code)/i.test(rawOutput);
  const output =
    rawOutput && (failed || process.env.OPENCODE_DEBUG_VERBOSE === "1")
      ? ` output=${rawOutput.slice(-1500)}`
      : "";
  return {
    message: `OpenCode tool ${status}: ${title || tool}${output}${error}`,
    dedupeKey: `tool:${String(candidate.id ?? title ?? tool)}:${status}`,
    level: failed ? "WARN" : "INFO",
  };
}

function formatOpenCodeEvent(event: unknown, sessionId: string): FormattedOpenCodeLog | null {
  if (!event || typeof event !== "object") return null;
  const currentSessionId = eventSessionId(event);
  if (currentSessionId && currentSessionId !== sessionId) return null;

  const candidate = event as {
    type?: unknown;
    properties?: {
      status?: { type?: unknown; attempt?: unknown; message?: unknown };
      error?: unknown;
      permission?: unknown;
      patterns?: unknown;
      reply?: unknown;
      requestID?: unknown;
      name?: unknown;
      arguments?: unknown;
      info?: {
        role?: unknown;
        finish?: unknown;
        error?: unknown;
        structured?: unknown;
        providerID?: unknown;
        modelID?: unknown;
      };
      part?: unknown;
      field?: unknown;
      delta?: unknown;
      questions?: unknown;
    };
  };

  switch (candidate.type) {
    case "session.status": {
      const status = candidate.properties?.status;
      if (!status) return null;
      const statusType = typeof status.type === "string" ? status.type : stringifyForLog(status);
      if (statusType === "retry") {
        return {
          message: `OpenCode session retry: ${stringifyForLog(status)}`,
          dedupeKey: `session:retry:${String(status.attempt ?? "unknown")}`,
          level: "WARN",
        };
      }
      if (process.env.OPENCODE_DEBUG_VERBOSE !== "1") return null;
      return {
        message: `OpenCode session status: ${statusType}`,
        dedupeKey: `session:status:${statusType}`,
      };
    }
    case "session.idle":
      return { message: "OpenCode session idle", dedupeKey: "session:idle" };
    case "session.error":
      return {
        message: `OpenCode session error: ${stringifyForLog(candidate.properties?.error)}`,
        dedupeKey: "session:error",
        level: "ERROR",
      };
    case "permission.asked":
      return {
        message: `OpenCode permission asked: ${stringifyForLog({
          permission: candidate.properties?.permission,
          patterns: candidate.properties?.patterns,
        })}`,
        level: "WARN",
      };
    case "permission.replied":
      return {
        message: `OpenCode permission replied: ${stringifyForLog({
          requestID: candidate.properties?.requestID,
          reply: candidate.properties?.reply,
        })}`,
      };
    case "question.asked":
      return {
        message: `OpenCode question asked: ${stringifyForLog(candidate.properties?.questions)}`,
        level: "WARN",
      };
    case "command.executed":
      if (process.env.OPENCODE_DEBUG_VERBOSE !== "1") return null;
      return {
        message: `OpenCode command executed: ${String(candidate.properties?.name ?? "")} ${String(candidate.properties?.arguments ?? "")}`,
      };
    case "message.updated": {
      const info = candidate.properties?.info;
      if (!info || info.role !== "assistant") return null;
      if (info.error) {
        return {
          message: `OpenCode assistant error: ${stringifyForLog(info.error)}`,
          dedupeKey: "assistant:error",
          level: "ERROR",
        };
      }
      if (info.structured) {
        return {
          message: "OpenCode produced structured output",
          dedupeKey: "assistant:structured",
        };
      }
      if (info.finish) {
        return {
          message: `OpenCode assistant finish: ${String(info.finish)}`,
          dedupeKey: `assistant:finish:${String(info.finish)}`,
        };
      }
      return null;
    }
    case "message.part.updated":
      return formatOpenCodePart(candidate.properties?.part);
    case "message.part.delta": {
      if (process.env.OPENCODE_DEBUG_VERBOSE !== "1") return null;
      const field = String(candidate.properties?.field ?? "");
      const delta = String(candidate.properties?.delta ?? "");
      if (!delta) return null;
      return { message: `OpenCode delta ${field}: ${delta.slice(-1000)}` };
    }
    default:
      return null;
  }
}

export async function startOpenCodeEventLogging(
  job: PublishPrepJob,
  opencode: OpenCodeInstance,
  rootDir: string,
  sessionId: string,
  promptSignal: AbortSignal,
  onRetry: (attempt: number, message: string) => void,
  onActivity: () => void,
) {
  const controller = new AbortController();
  const runtime = getJobRuntimeStore().get(job.id);
  const signal = AbortSignal.any([
    controller.signal,
    promptSignal,
    ...(runtime ? [runtime.controller.signal] : []),
  ]);
  let events: Awaited<ReturnType<typeof opencode.client.event.subscribe>>;
  try {
    events = await opencode.client.event.subscribe(
      { directory: rootDir },
      {
        signal,
        onSseError(error) {
          if (!signal.aborted) {
            pushLog(job, `OpenCode SSE error: ${stringifyForLog(error)}`, {
              level: "WARN",
            });
          }
        },
      },
    );
  } catch (error) {
    pushLog(job, `OpenCode event subscription failed: ${stringifyForLog(error)}`);
    throw error;
  }

  let resolveCompletion: () => void = () => undefined;
  let rejectCompletion: (error: Error) => void = () => undefined;
  let completionSettled = false;
  let promptStarted = false;
  let sawPromptActivity = false;
  const completion = new Promise<void>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });
  // The consumer awaits this after promptAsync is accepted. Attach a rejection
  // handler immediately so an early SSE failure is never reported as unhandled.
  void completion.catch(() => undefined);

  const settleCompletion = (error?: Error) => {
    if (completionSettled) return;
    completionSettled = true;
    signal.removeEventListener("abort", handleAbort);
    if (error) {
      rejectCompletion(error);
    } else {
      resolveCompletion();
    }
  };
  const handleAbort = () => {
    const reason = signal.reason;
    settleCompletion(
      reason instanceof Error
        ? reason
        : new Error(String(reason ?? "OpenCode session wait was aborted")),
    );
  };
  signal.addEventListener("abort", handleAbort, { once: true });
  if (signal.aborted) handleAbort();

  const done = (async () => {
    try {
      for await (const event of events.stream) {
        const currentSessionId = eventSessionId(event);
        const eventType =
          event && typeof event === "object"
            ? String((event as { type?: unknown }).type ?? "")
            : "";
        if (promptStarted && currentSessionId === sessionId && eventType !== "session.idle") {
          sawPromptActivity = true;
          onActivity();
        }
        if (
          currentSessionId === sessionId &&
          event &&
          typeof event === "object" &&
          (event as { type?: unknown }).type === "session.status"
        ) {
          const status = (
            event as {
              properties?: {
                status?: {
                  type?: unknown;
                  attempt?: unknown;
                  message?: unknown;
                };
              };
            }
          ).properties?.status;
          if (status?.type === "retry" && typeof status.attempt === "number") {
            onRetry(status.attempt, typeof status.message === "string" ? status.message : "");
          }
        }
        const log = formatOpenCodeEvent(event, sessionId);
        if (log) {
          pushLog(job, log.message, {
            dedupeKey: log.dedupeKey,
            level: log.level,
          });
        }

        if (currentSessionId === sessionId && event && typeof event === "object") {
          const candidate = event as {
            type?: unknown;
            properties?: { error?: unknown };
          };
          if (candidate.type === "session.idle" && promptStarted && sawPromptActivity) {
            settleCompletion();
          } else if (candidate.type === "session.error") {
            settleCompletion(
              new Error(`OpenCode session error: ${stringifyForLog(candidate.properties?.error)}`),
            );
          }
        }
      }
      if (!signal.aborted) {
        settleCompletion(new Error("OpenCode event stream ended before the session became idle"));
      }
    } catch (error) {
      if (!signal.aborted) {
        pushLog(job, `OpenCode event logger failed: ${stringifyForLog(error)}`, {
          level: "ERROR",
        });
        settleCompletion(error instanceof Error ? error : new Error(String(error)));
      }
    }
  })();

  return {
    completion,
    beginPrompt() {
      promptStarted = true;
      sawPromptActivity = false;
      onActivity();
    },
    async stop() {
      controller.abort();
      await done.catch(() => undefined);
    },
  };
}

async function runOpenCodePublishPrep(
  job: PublishPrepJob,
  videoPath: string,
  videoMeta: VideoMeta,
  parentWorks: ParentWork[],
): Promise<PublishPrepJobResult> {
  const rootDir = getRootDir();
  const runtime = getJobRuntimeStore().get(job.id);
  if (runtime?.controller.signal.aborted) {
    throw new Error("Job was canceled");
  }
  const procedure = await fs.readFile(getUploadProcedurePath(), "utf-8");
  await ensureBrowserWritableDirs();

  const previousEnv = {
    AGENT_BROWSER_HEADED: process.env.AGENT_BROWSER_HEADED,
    AGENT_BROWSER_PROFILE: process.env.AGENT_BROWSER_PROFILE,
    AGENT_BROWSER_SESSION: process.env.AGENT_BROWSER_SESSION,
    AGENT_BROWSER_SESSION_NAME: process.env.AGENT_BROWSER_SESSION_NAME,
    AGENT_BROWSER_ALLOWED_DOMAINS: process.env.AGENT_BROWSER_ALLOWED_DOMAINS,
    AGENT_BROWSER_ARGS: process.env.AGENT_BROWSER_ARGS,
    AGENT_BROWSER_EXECUTABLE_PATH: process.env.AGENT_BROWSER_EXECUTABLE_PATH,
    AGENT_BROWSER_CDP: process.env.AGENT_BROWSER_CDP,
  };
  await ensureNiconicoChrome();
  Object.assign(process.env, await getAgentBrowserEnv());
  await attachAgentBrowserToNiconicoChrome();
  pushLog(job, `Attached to existing Chrome via CDP port ${NICONICO_CHROME_CDP_PORT}`);

  let opencode: OpenCodeInstance | undefined;
  try {
    pushLog(job, "Starting OpenCode SDK server");
    pushLog(job, `OpenCode internal log directory: ${getOpenCodeInternalLogDir()}`);
    pushLog(
      job,
      `OpenCode config: model=${process.env.OPENCODE_MODEL?.trim() || "(default)"} structuredOutput=${shouldUseOpenCodeStructuredOutput() ? "on" : "off"}`,
    );
    opencode = await createOpencode({
      port: getOpenCodePort(),
      timeout: 10000,
      config: getOpenCodeConfig(rootDir),
    });
    if (runtime) {
      runtime.opencode = opencode;
    }
    pushLog(job, `OpenCode server started at ${opencode.server.url}`);
    const openCodeLogPath = await findLatestOpenCodeLogPath();
    if (openCodeLogPath) {
      pushLog(job, `OpenCode internal log: ${openCodeLogPath}`);
    }
    await logOpenCodeToolIds(job, opencode, rootDir);

    const permission = [
      {
        permission: "edit",
        pattern: "*",
        action: "deny" as const,
      },
      {
        permission: "external_directory",
        pattern: "*",
        action: "deny" as const,
      },
      {
        permission: "bash",
        pattern: `pnpm --dir ${rootDir} exec agent-browser *`,
        action: "allow" as const,
      },
      {
        permission: "bash",
        pattern: "pnpm exec agent-browser *",
        action: "allow" as const,
      },
      {
        permission: "bash",
        pattern: "*",
        action: "deny" as const,
      },
    ];
    const session = await opencode.client.session.create({
      directory: rootDir,
      title: "Niconico publish prep",
      permission,
    });
    if (session.error) {
      throw new Error(`OpenCode session create failed: ${JSON.stringify(session.error)}`);
    }
    if (runtime) {
      runtime.sessionId = session.data.id;
    }
    pushLog(job, `OpenCode session created: ${session.data.id}`);
    const promptController = new AbortController();
    const promptSignal = runtime
      ? AbortSignal.any([promptController.signal, runtime.controller.signal])
      : promptController.signal;
    const hardTimeoutMs = getOpenCodePromptHardTimeoutMs();
    const inactivityTimeoutMs = getOpenCodePromptInactivityTimeoutMs();
    const maxRetryAttempts = getOpenCodeMaxRetryAttempts();
    const hardTimeout = setTimeout(() => {
      promptController.abort(new Error(`OpenCode prompt hard timeout after ${hardTimeoutMs}ms`));
    }, hardTimeoutMs);
    let inactivityTimeout: ReturnType<typeof setTimeout> | undefined;
    const resetInactivityTimeout = () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => {
        promptController.abort(
          new Error(`OpenCode prompt had no activity for ${inactivityTimeoutMs}ms`),
        );
      }, inactivityTimeoutMs);
    };
    let eventLogger: Awaited<ReturnType<typeof startOpenCodeEventLogging>>;
    try {
      eventLogger = await startOpenCodeEventLogging(
        job,
        opencode,
        rootDir,
        session.data.id,
        promptSignal,
        (attempt, message) => {
          if (maxRetryAttempts > 0 && attempt >= maxRetryAttempts) {
            promptController.abort(
              new Error(`OpenCode retry limit reached at attempt ${attempt}: ${message}`),
            );
          }
        },
        resetInactivityTimeout,
      );
    } catch (error) {
      clearTimeout(hardTimeout);
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      throw error;
    }
    pushLog(
      job,
      `OpenCode prompt guard: mode=async inactivityTimeout=${inactivityTimeoutMs}ms hardTimeout=${hardTimeoutMs}ms maxRetries=${maxRetryAttempts}`,
    );

    const parentWorkIds = parentWorks
      .map((work) => extractNiconicoVideoId(work.url))
      .filter((id): id is string => Boolean(id));
    if (parentWorkIds.length !== parentWorks.length) {
      throw new Error(
        "One or more Niconico parent work URLs do not contain a valid sm/ss video ID",
      );
    }
    const descriptionHtml = toNiconicoDescriptionHtml(videoMeta.description);
    const prompt = `
${procedure}

## 実行時の設定値

- リポジトリルート: ${JSON.stringify(rootDir)}
- agent-browserコマンドの接頭辞: ${JSON.stringify(getAgentBrowserCliPrefix(rootDir))}
- ブラウザーセッション: ${JSON.stringify(AGENT_BROWSER_SESSION)}
- 既存のヘッド付きChromeにCDPで接続する。新しいChromeは起動しない。
- 開始URLがすでに開いている場合は open しない。
- ブラウザーは閉じない。
- 接頭辞以外に --browser-args、--args、--executable-path、--allowed-domains、--session-name、--cdp を追加しない。

## 作業入力

- 開始URL: ${JSON.stringify(NICONICO_UPLOAD_URL)}
- 対象mp4: ${JSON.stringify(videoPath)}
- 動画タイトル: ${JSON.stringify(videoMeta.title)}
- 動画説明文: ${JSON.stringify(descriptionHtml)}
- 動画タイトル(Base64 UTF-8): ${Buffer.from(videoMeta.title, "utf-8").toString("base64")}
- 動画説明文(Base64 UTF-8): ${Buffer.from(descriptionHtml, "utf-8").toString("base64")}
- サムネイル時刻: ${JSON.stringify(videoMeta.thumbnailTime)}
- 確認前に登録する親作品: ${JSON.stringify(parentWorks)}
- 確認する親作品ID: ${JSON.stringify(parentWorkIds)}
- 親作品確認eval用の配列要素: ${parentWorkIds.map((id) => `'${id}'`).join(",")}

## 最終応答

手順を実行し、Markdownを付けず次の形式のJSONだけを返す。画面から実際に確認した値を入れる。
{"url":"<current url>","title":"<page title>","finalResponse":"<brief summary>","videoPath":${JSON.stringify(videoPath)},"reachedConfirmation":true,"finalSubmitClicked":false,"actualVideoTitle":${JSON.stringify(videoMeta.title)},"actualThumbnailTime":${JSON.stringify(videoMeta.thumbnailTime)},"registeredParentWorkIds":${JSON.stringify(parentWorkIds)}}
`.trim();

    try {
      const structuredOutput = shouldUseOpenCodeStructuredOutput();
      eventLogger.beginPrompt();
      const promptStartedAt = Date.now();
      const response = await opencode.client.session.promptAsync(
        {
          sessionID: session.data.id,
          directory: rootDir,
          agent: "build",
          tools: {
            bash: true,
            invalid: true,
            question: false,
            read: false,
            glob: false,
            grep: false,
            task: false,
            webfetch: false,
            websearch: false,
            todowrite: false,
            skill: false,
          },
          ...(structuredOutput
            ? {
                format: {
                  type: "json_schema" as const,
                  retryCount: 2,
                  schema: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                      title: { type: "string" },
                      finalResponse: { type: "string" },
                      videoPath: { type: "string" },
                      reachedConfirmation: { type: "boolean" },
                      finalSubmitClicked: { type: "boolean" },
                      actualVideoTitle: { type: "string" },
                      actualThumbnailTime: { type: "string" },
                      registeredParentWorkIds: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: [
                      "url",
                      "title",
                      "finalResponse",
                      "videoPath",
                      "reachedConfirmation",
                      "finalSubmitClicked",
                      "actualVideoTitle",
                      "actualThumbnailTime",
                      "registeredParentWorkIds",
                    ],
                    additionalProperties: false,
                  },
                },
              }
            : {}),
          parts: [{ type: "text", text: prompt }],
        },
        {
          signal: promptSignal,
        },
      );
      if (response.error) {
        throw new Error(`OpenCode async prompt failed: ${stringifyForLog(response.error)}`);
      }
      pushLog(job, "OpenCode async prompt accepted; waiting for session idle");
      await eventLogger.completion;
      pushLog(
        job,
        `OpenCode session completed in ${Date.now() - promptStartedAt}ms; loading final message`,
      );

      const messages = await opencode.client.session.messages({
        sessionID: session.data.id,
        directory: rootDir,
      });
      if (messages.error) {
        throw new Error(`OpenCode messages fetch failed: ${stringifyForLog(messages.error)}`);
      }
      const finalMessage = messages.data
        .filter((message) => message.info.role === "assistant")
        .sort((a, b) => a.info.time.created - b.info.time.created)
        .at(-1);
      if (!finalMessage || finalMessage.info.role !== "assistant") {
        throw new Error("OpenCode completed without an assistant message");
      }

      const partLog = formatMessageParts(finalMessage.parts);
      if (partLog) pushLog(job, partLog.slice(-4000));
      if (finalMessage.info.error) {
        throw new Error(`OpenCode response error: ${stringifyForLog(finalMessage.info.error)}`);
      }

      const result =
        finalMessage.info.structured === undefined
          ? parseResultText(partLog)
          : parseResult(finalMessage.info.structured);
      const validationErrors = validatePublishPrepResult(result, {
        videoPath,
        videoTitle: videoMeta.title,
        thumbnailTime: videoMeta.thumbnailTime,
        parentWorkIds,
      });
      if (validationErrors.length > 0) {
        throw new Error(
          `OpenCode publish prep verification failed: ${validationErrors.join(
            "; ",
          )}. Response: ${stringifyForLog(finalMessage.info.structured ?? partLog)}`,
        );
      }
      pushLog(
        job,
        `Publish prep verified: title=${result.actualVideoTitle} thumbnail=${result.actualThumbnailTime} parentWorks=${result.registeredParentWorkIds.length} confirmation=${result.reachedConfirmation}`,
      );
      return result;
    } catch (error) {
      pushLog(job, `OpenCode prompt threw: ${stringifyForLog(error)}`, {
        level: "ERROR",
      });
      try {
        const health = await opencode.client.global.health();
        pushLog(
          job,
          `OpenCode health after prompt error: ${stringifyForLog(health.error ?? health.data)}`,
        );
      } catch (healthError) {
        pushLog(
          job,
          `OpenCode health check failed after prompt error: ${stringifyForLog(healthError)}`,
          { level: "WARN" },
        );
      }
      throw error;
    } finally {
      clearTimeout(hardTimeout);
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      await eventLogger.stop();
    }
  } finally {
    opencode?.server.close();
    for (const [key, value] of Object.entries(previousEnv)) {
      if (typeof value === "string") {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  }
}

export type PublishVideoMeta = VideoMeta;

export function createPublishPrepJob(): PublishPrepJob {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const job: PublishPrepJob = {
    id,
    status: "queued",
    logs: [],
    logPath: createPublishPrepLogPath(id, createdAt),
    createdAt,
    updatedAt: createdAt,
  };
  getJobStore().set(job.id, job);
  getJobRuntimeStore().set(job.id, {
    controller: new AbortController(),
    lastLogByKey: new Map(),
  });
  pushLog(job, `Job queued; persistent log: ${job.logPath}`);
  void prunePublishPrepLogs(job.logPath);
  return job;
}

export function assertPublishVideoMeta(value: unknown): VideoMeta {
  return assertVideoMeta(value);
}

export function toParentWorks(parentWorkIds: string[]): ParentWork[] {
  return parentWorkIds.map((id) => ({
    title: id,
    url: id.startsWith("ss")
      ? `https://www.nicovideo.jp/shorts/${id}`
      : `https://www.nicovideo.jp/watch/${id}`,
  }));
}

export async function runPublishPrep(
  job: PublishPrepJob,
  videoPath: string,
  videoMeta: VideoMeta,
  parentWorkIds: string[],
): Promise<PublishPrepJobResult> {
  updateJob(job, { status: "running" });
  pushLog(job, "Starting Niconico publish prep");
  pushLog(job, `Resolved rendered video: ${videoPath}`);
  const parentWorks = toParentWorks(parentWorkIds);
  if (parentWorks.length > 0) {
    pushLog(
      job,
      `Niconico parent works: ${parentWorks
        .map((work) => `${work.title}: ${work.url}`)
        .join(" | ")}`,
    );
  }

  const publishPrepStartedAt = Date.now();
  const result = await runOpenCodePublishPrep(job, videoPath, videoMeta, parentWorks);
  pushLog(job, `Niconico browser phase completed in ${Date.now() - publishPrepStartedAt}ms`);
  const runtime = getJobRuntimeStore().get(job.id);
  if (runtime?.controller.signal.aborted) {
    throw new Error("Job was canceled");
  }
  updateJob(job, {
    status: "succeeded",
    result,
  });
  pushLog(job, "Niconico publish prep succeeded");
  return result;
}

export async function cancelPublishPrepJob(jobId: string): Promise<PublishPrepJob> {
  const job = getJobStore().get(jobId);
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.status === "succeeded" || job.status === "failed" || job.status === "canceled") {
    return job;
  }

  const runtime = getJobRuntimeStore().get(jobId);
  updateJob(job, {
    status: "canceled",
    error: "Canceled by user",
  });
  pushLog(job, "Cancel requested by user");

  runtime?.controller.abort(new Error("Canceled by user"));
  if (runtime?.opencode && runtime.sessionId) {
    try {
      await runtime.opencode.client.session.abort({
        sessionID: runtime.sessionId,
        directory: getRootDir(),
      });
      pushLog(job, "OpenCode session abort requested");
    } catch (error) {
      pushLog(job, `OpenCode session abort failed: ${stringifyForLog(error)}`);
    }
  }

  return job;
}

export function finishPublishPrepJob(job: PublishPrepJob) {
  pushLog(job, `Job finished: status=${job.status} durationMs=${Date.now() - job.createdAt}`);
  getJobRuntimeStore().delete(job.id);
}

export function markPublishPrepFailed(job: PublishPrepJob, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (job.status === "canceled") {
    pushLog(job, `canceled: ${message}`);
    return;
  }
  updateJob(job, {
    status: "failed",
    error: message,
  });
  pushLog(job, `failed: ${message}`, { level: "ERROR" });
}

export function getPublishPrepJob(jobId: string) {
  return getJobStore().get(jobId);
}

export function getActivePublishJob() {
  return getActivePublishPrepJob();
}

export { pushLog, updateJob };
