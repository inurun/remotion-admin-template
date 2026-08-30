import { execFile, spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Codex, type CodexOptions, type ThreadEvent, type ThreadOptions } from "@openai/codex-sdk";
import { z } from "zod";
import { nowIso, toIso } from "@/_shared/lib/date";
import { extractNiconicoVideoId } from "@/_shared/project/project-meta";
import { PROJECT_ROOT } from "@/server/_shared/storage";
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

type PublishPrepJobRuntime = {
  controller: AbortController;
  lastLogByKey: Map<string, string>;
  threadId?: string;
};

type VideoMeta = {
  title: string;
  description: string;
  thumbnailTime: string;
};

type ParentWork = {
  title: string;
  url: string;
};

type PublishCodexRuntime = {
  hostHomeDir: string;
  homeDir: string;
  codexHomeDir: string;
  workspaceDir: string;
};

const STORE_KEY = "__niconicoPublishPrepJobs";
const RUNTIME_STORE_KEY = "__niconicoPublishPrepJobRuntimes";
const JOB_LISTENERS_KEY = "__niconicoPublishPrepJobListeners";
const NICONICO_UPLOAD_URL = "https://garage.nicovideo.jp/niconico-garage/video/videos/upload";
const AGENT_BROWSER_SESSION = "niconico-publish";
const NICONICO_CHROME_CDP_PORT = 9222;
const NICONICO_CHROME_READY_TIMEOUT_MS = 15_000;
const DEFAULT_HARD_TIMEOUT_MS = 1_200_000;
const DEFAULT_INACTIVITY_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_PUBLISH_LOG_FILES = 50;
const THUMBNAIL_TIME_PATTERN = /^\d{2}:[0-5]\d\.\d{3}$/;
const SKILLS_CONTEXT_WARNING =
  "Skill descriptions were shortened to fit the skills context budget.";
// agent-browser 0.35.1 exposes upload only through `all`; Codex sees only this allowlist.
const AGENT_BROWSER_ENABLED_TOOLS = [
  "agent_browser_open",
  "agent_browser_snapshot",
  "agent_browser_click",
  "agent_browser_fill",
  "agent_browser_type",
  "agent_browser_press",
  "agent_browser_wait_ms",
  "agent_browser_wait_for_selector",
  "agent_browser_wait_for_text",
  "agent_browser_wait_for_url",
  "agent_browser_wait_for_load",
  "agent_browser_wait_for_function",
  "agent_browser_get_text",
  "agent_browser_get_html",
  "agent_browser_get_value",
  "agent_browser_get_attr",
  "agent_browser_get_url",
  "agent_browser_get_title",
  "agent_browser_eval",
  "agent_browser_upload",
  "agent_browser_is_visible",
  "agent_browser_is_enabled",
  "agent_browser_find",
];
const execFileAsync = promisify(execFile);
const DEFAULT_CHROME_EXECUTABLE_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
];

const publishResultSchema = z.object({
  outcome: z.enum(["ready", "blocked"]),
  blockingReason: z.string().nullable(),
  url: z.string(),
  title: z.string(),
  finalResponse: z.string(),
  videoPath: z.string(),
  reachedConfirmation: z.boolean(),
  finalSubmitClicked: z.boolean(),
  actualVideoTitle: z.string(),
  actualThumbnailTime: z.string(),
  registeredParentWorkIds: z.array(z.string()),
});
type CodexPublishResult = z.infer<typeof publishResultSchema>;

export const PUBLISH_RESULT_SCHEMA = z.toJSONSchema(publishResultSchema);

function getJobStore(): Map<string, PublishPrepJob> {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: Map<string, PublishPrepJob>;
  };
  return (globalStore[STORE_KEY] ??= new Map());
}

function getJobRuntimeStore(): Map<string, PublishPrepJobRuntime> {
  const globalStore = globalThis as typeof globalThis & {
    [RUNTIME_STORE_KEY]?: Map<string, PublishPrepJobRuntime>;
  };
  return (globalStore[RUNTIME_STORE_KEY] ??= new Map());
}

function getJobListeners(): Set<(job: PublishPrepJob) => void> {
  const globalStore = globalThis as typeof globalThis & {
    [JOB_LISTENERS_KEY]?: Set<(job: PublishPrepJob) => void>;
  };
  return (globalStore[JOB_LISTENERS_KEY] ??= new Set());
}

function emitJob(job: PublishPrepJob) {
  for (const listener of getJobListeners()) listener(job);
}

export function subscribePublishPrepJob(listener: (job: PublishPrepJob) => void) {
  getJobListeners().add(listener);
  return () => getJobListeners().delete(listener);
}

function updateJob(job: PublishPrepJob, patch: Partial<PublishPrepJob>) {
  Object.assign(job, patch, { updatedAt: Date.now() });
  emitJob(job);
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

function pushLog(
  job: PublishPrepJob,
  message: string,
  options: { dedupeKey?: string; level?: "INFO" | "WARN" | "ERROR" } = {},
) {
  const normalizedMessage = normalizeLogMessage(message);
  const runtime = getJobRuntimeStore().get(job.id);
  if (options.dedupeKey && runtime) {
    if (runtime.lastLogByKey.get(options.dedupeKey) === normalizedMessage) return;
    runtime.lastLogByKey.set(options.dedupeKey, normalizedMessage);
  }

  const level = options.level ?? "INFO";
  const line = `[${nowIso()}] [${level}] ${normalizedMessage}`;
  job.logs.push(line);
  if (job.logs.length > 500) job.logs.splice(0, job.logs.length - 500);
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

function getPositiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function prunePublishPrepLogs(currentLogPath: string) {
  try {
    const logDir = path.dirname(currentLogPath);
    const filenames = (await fs.readdir(logDir))
      .filter((filename) => filename.endsWith(".log"))
      .sort();
    const maxFiles = getPositiveInteger(
      "NICONICO_PUBLISH_LOG_MAX_FILES",
      DEFAULT_MAX_PUBLISH_LOG_FILES,
    );
    await Promise.all(
      filenames
        .slice(0, Math.max(0, filenames.length - maxFiles))
        .filter((filename) => path.join(logDir, filename) !== currentLogPath)
        .map((filename) => fs.unlink(path.join(logDir, filename))),
    );
  } catch (error) {
    console.error(`[niconico] Failed to prune publish logs: ${stringifyForLog(error)}`);
  }
}

function getProfileDir(): string {
  return path.resolve(PROJECT_ROOT, ".agent-browser/niconico-profile");
}

function getAgentBrowserStateDir(): string {
  return path.join(os.homedir(), ".agent-browser");
}

export function createPublishCodexRuntime(realHome = os.homedir()): PublishCodexRuntime {
  const baseDir = path.join(realHome, ".cache/niconico-publish-codex");
  return {
    hostHomeDir: realHome,
    homeDir: path.join(baseDir, "home"),
    codexHomeDir: path.join(baseDir, "codex-home"),
    workspaceDir: path.join(baseDir, "workspace"),
  };
}

async function preparePublishCodexRuntime(runtime: PublishCodexRuntime) {
  const runtimeDirs = [runtime.homeDir, runtime.codexHomeDir, runtime.workspaceDir];
  await Promise.all(runtimeDirs.map((dir) => fs.mkdir(dir, { recursive: true, mode: 0o700 })));
  await Promise.all(runtimeDirs.map((dir) => fs.chmod(dir, 0o700)));
  const authSource = path.join(runtime.hostHomeDir, ".codex/auth.json");
  const authTarget = path.join(runtime.codexHomeDir, "auth.json");
  await fs.copyFile(authSource, authTarget);
  await fs.chmod(authTarget, 0o600);
}

function processEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

function isCdpPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
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

async function ensureNiconicoChrome() {
  if (await isCdpPortListening(NICONICO_CHROME_CDP_PORT)) return;
  const executablePath = await resolveAgentBrowserExecutablePath();
  if (!executablePath) throw new Error("Google Chrome is required for Niconico publish");

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
    { detached: true, stdio: "ignore" },
  );
  child.unref();
  await waitForCdpPort(NICONICO_CHROME_CDP_PORT, NICONICO_CHROME_READY_TIMEOUT_MS);
}

async function attachAgentBrowserToNiconicoChrome() {
  await execFileAsync(
    "pnpm",
    [
      "--dir",
      PROJECT_ROOT,
      "exec",
      "agent-browser",
      "--session",
      AGENT_BROWSER_SESSION,
      "--cdp",
      String(NICONICO_CHROME_CDP_PORT),
      "get",
      "url",
    ],
    { cwd: PROJECT_ROOT, timeout: 15_000 },
  );
}

function assertVideoMeta(value: unknown): VideoMeta {
  if (!value || typeof value !== "object") throw new Error("videoMeta is required");
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

export function parsePublishResult(text: string): CodexPublishResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`Codex returned invalid JSON: ${stringifyForLog(error)}`);
  }
  const result = publishResultSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Codex returned an invalid publish result: ${result.error.message}`);
  }
  return result.data;
}

export function shouldRetryBlockedResult(rejectedBlockedResults: number, mcpAttempts: number) {
  return rejectedBlockedResults === 0 || mcpAttempts < 2;
}

export function createPublishAbortGuard(
  parentSignal: AbortSignal,
  hardTimeoutMs: number,
  inactivityTimeoutMs: number,
) {
  const controller = new AbortController();
  const hardTimeout = setTimeout(
    () => controller.abort(new Error(`Codex hard timeout after ${hardTimeoutMs}ms`)),
    hardTimeoutMs,
  );
  let inactivityTimeout: ReturnType<typeof setTimeout>;
  const activity = () => {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(
      () => controller.abort(new Error(`Codex had no activity for ${inactivityTimeoutMs}ms`)),
      inactivityTimeoutMs,
    );
  };
  activity();

  return {
    signal: AbortSignal.any([parentSignal, controller.signal]),
    activity,
    stop() {
      clearTimeout(hardTimeout);
      clearTimeout(inactivityTimeout);
    },
  };
}

export function createPublishCodexOptions(
  rootDir = PROJECT_ROOT,
  runtime = createPublishCodexRuntime(),
): CodexOptions {
  return {
    env: {
      ...processEnv(),
      HOME: runtime.homeDir,
      CODEX_HOME: runtime.codexHomeDir,
      XDG_CONFIG_HOME: path.join(runtime.homeDir, ".config"),
      XDG_CACHE_HOME: path.join(runtime.homeDir, ".cache"),
    },
    config: {
      agents: {
        enabled: false,
      },
      apps: {
        _default: {
          enabled: false,
        },
      },
      features: {
        shell_tool: false,
      },
      mcp_servers: {
        agent_browser: {
          command: "pnpm",
          args: [
            "--dir",
            rootDir,
            "exec",
            "agent-browser",
            "--session",
            AGENT_BROWSER_SESSION,
            "--cdp",
            String(NICONICO_CHROME_CDP_PORT),
            "mcp",
            "--tools",
            "all",
          ],
          default_tools_approval_mode: "approve",
          enabled_tools: AGENT_BROWSER_ENABLED_TOOLS,
          env: {
            HOME: runtime.hostHomeDir,
            XDG_CONFIG_HOME:
              process.env.XDG_CONFIG_HOME ?? path.join(runtime.hostHomeDir, ".config"),
            XDG_CACHE_HOME: process.env.XDG_CACHE_HOME ?? path.join(runtime.hostHomeDir, ".cache"),
          },
          startup_timeout_sec: 30,
          tool_timeout_sec: 180,
        },
      },
    },
  };
}

export function createPublishThreadOptions(
  workspaceDir = createPublishCodexRuntime().workspaceDir,
): ThreadOptions {
  return {
    model: "gpt-5.6-luna",
    modelReasoningEffort: "low",
    sandboxMode: "read-only",
    approvalPolicy: "never",
    workingDirectory: workspaceDir,
    skipGitRepoCheck: true,
    networkAccessEnabled: false,
    webSearchMode: "disabled",
  };
}

function logCodexItem(job: PublishPrepJob, event: ThreadEvent): string | undefined {
  if (
    event.type !== "item.started" &&
    event.type !== "item.updated" &&
    event.type !== "item.completed"
  ) {
    return undefined;
  }

  const item = event.item;
  if (item.type === "command_execution" || item.type === "file_change") {
    throw new Error(`Codex attempted forbidden ${item.type}`);
  }
  if (item.type === "error") {
    if (item.message.includes(SKILLS_CONTEXT_WARNING)) {
      pushLog(job, `Codex advisory: ${item.message}`, { level: "WARN" });
      return undefined;
    }
    throw new Error(`Codex item error: ${item.message}`);
  }
  if (item.type === "agent_message") {
    return event.type === "item.completed" ? item.text : undefined;
  }
  if (item.type !== "mcp_tool_call") return undefined;
  if (item.server !== "agent_browser") {
    throw new Error(`Codex attempted forbidden MCP server: ${item.server}`);
  }

  const errorMessage =
    item.status === "failed"
      ? (item.error?.message ?? ("result" in item ? stringifyForLog(item.result) : "unknown error"))
      : undefined;
  pushLog(
    job,
    `Codex MCP ${item.tool}: ${item.status}${errorMessage ? ` (${errorMessage})` : ""}`,
    {
      dedupeKey: `mcp:${item.id}:${item.status}`,
      level: item.status === "failed" ? "WARN" : "INFO",
    },
  );
  return undefined;
}

export async function consumeCodexEvents(
  job: PublishPrepJob,
  events: AsyncIterable<ThreadEvent>,
  onActivity: (event: ThreadEvent) => void = () => undefined,
): Promise<string> {
  let finalResponse: string | undefined;
  let completed = false;

  for await (const event of events) {
    onActivity(event);
    if (event.type === "thread.started") {
      const runtime = getJobRuntimeStore().get(job.id);
      if (runtime) runtime.threadId = event.thread_id;
      pushLog(job, `Codex thread started: ${event.thread_id}`);
      continue;
    }
    if (event.type === "turn.failed") throw new Error(`Codex turn failed: ${event.error.message}`);
    if (event.type === "error") throw new Error(`Codex stream failed: ${event.message}`);
    if (event.type === "turn.completed") {
      completed = true;
      pushLog(
        job,
        `Codex turn completed: inputTokens=${event.usage.input_tokens} outputTokens=${event.usage.output_tokens} reasoningTokens=${event.usage.reasoning_output_tokens}`,
      );
      continue;
    }

    const response = logCodexItem(job, event);
    if (response !== undefined) finalResponse = response;
  }

  if (!completed) throw new Error("Codex stream ended before turn completion");
  if (!finalResponse) throw new Error("Codex completed without a final response");
  return finalResponse;
}

function createPrompt(
  procedure: string,
  videoPath: string,
  videoMeta: VideoMeta,
  parentWorks: ParentWork[],
  parentWorkIds: string[],
) {
  const descriptionHtml = toNiconicoDescriptionHtml(videoMeta.description);
  return `
${procedure}

## 実行時の設定値

- 利用できるブラウザーツールは agent_browser MCPだけ。
- シェル、ファイル編集、web search、ほかのMCPは使わない。
- 既存のヘッド付きChromeへ接続済み。新しいChromeやタブを開かず、ブラウザーを閉じない。
- MCP操作が失敗しても停止しない。snapshotで現在状態を確認し、同じ引数を盲目的に繰り返さず別のref・selector・入力方法で続行する。
- UIを変えるclickの直後は、依存するevalや入力より先にwaitまたはsnapshotを実行する。
- blockedを返せるのは、現在URLとsnapshotを確認し、複数の代替手段を試しても続行不能な場合だけ。単発のMCP失敗はblockedではない。
- ALL_TOOLSやツール説明を出力・列挙しない。手順書に記載した既知のagent-browser MCPを直接使う。
- agent_browser_wait_ms の待機時間は ms で渡す。timeMs ではない。

## 作業入力

- 開始URL: ${JSON.stringify(NICONICO_UPLOAD_URL)}
- 対象mp4: ${JSON.stringify(videoPath)}
- 動画タイトル: ${JSON.stringify(videoMeta.title)}
- 動画説明文HTML: ${JSON.stringify(descriptionHtml)}
- 動画説明文(Base64 UTF-8): ${Buffer.from(descriptionHtml, "utf-8").toString("base64")}
- サムネイル時刻: ${JSON.stringify(videoMeta.thumbnailTime)}
- 確認前に登録する親作品: ${JSON.stringify(parentWorks)}
- 確認する親作品ID: ${JSON.stringify(parentWorkIds)}

## 最終応答

手順を実行し、指定されたJSON Schemaに従って画面から実際に確認した値だけを返す。
`.trim();
}

async function runCodexPublishPrep(
  job: PublishPrepJob,
  videoPath: string,
  videoMeta: VideoMeta,
  parentWorks: ParentWork[],
): Promise<PublishPrepJobResult> {
  const runtime = getJobRuntimeStore().get(job.id);
  if (runtime?.controller.signal.aborted) throw new Error("Job was canceled");

  const procedure = await fs.readFile(
    path.resolve(PROJECT_ROOT, "src/server/features/publish/prompts/niconico-upload-procedure.md"),
    "utf-8",
  );
  await Promise.all([
    fs.mkdir(getProfileDir(), { recursive: true }),
    fs.mkdir(getAgentBrowserStateDir(), { recursive: true }),
  ]);
  await ensureNiconicoChrome();
  await attachAgentBrowserToNiconicoChrome();
  pushLog(job, `Attached to existing Chrome via CDP port ${NICONICO_CHROME_CDP_PORT}`);

  const parentWorkIds = parentWorks
    .map((work) => extractNiconicoVideoId(work.url))
    .filter((id): id is string => Boolean(id));
  if (parentWorkIds.length !== parentWorks.length) {
    throw new Error("One or more Niconico parent work URLs do not contain a valid sm/ss video ID");
  }

  const hardTimeoutMs = getPositiveInteger(
    "NICONICO_PUBLISH_HARD_TIMEOUT_MS",
    DEFAULT_HARD_TIMEOUT_MS,
  );
  const inactivityTimeoutMs = getPositiveInteger(
    "NICONICO_PUBLISH_INACTIVITY_TIMEOUT_MS",
    DEFAULT_INACTIVITY_TIMEOUT_MS,
  );
  const guard = createPublishAbortGuard(
    runtime?.controller.signal ?? new AbortController().signal,
    hardTimeoutMs,
    inactivityTimeoutMs,
  );

  try {
    pushLog(job, "Starting Codex SDK publish thread");
    pushLog(
      job,
      `Codex config: model=gpt-5.6-luna reasoning=low sandbox=read-only MCP=agent_browser`,
    );
    const codexRuntime = createPublishCodexRuntime();
    await preparePublishCodexRuntime(codexRuntime);
    pushLog(job, `Codex isolated runtime: ${codexRuntime.codexHomeDir}`);
    const codex = new Codex(createPublishCodexOptions(PROJECT_ROOT, codexRuntime));
    const thread = codex.startThread(createPublishThreadOptions(codexRuntime.workspaceDir));
    let prompt = createPrompt(procedure, videoPath, videoMeta, parentWorks, parentWorkIds);
    let rejectedBlockedResults = 0;
    for (;;) {
      const { events } = await thread.runStreamed(prompt, {
        outputSchema: PUBLISH_RESULT_SCHEMA,
        signal: guard.signal,
      });
      let mcpAttempts = 0;
      const finalResponse = await consumeCodexEvents(job, events, (event) => {
        guard.activity();
        if (
          event.type === "item.completed" &&
          event.item.type === "mcp_tool_call" &&
          (event.item.status === "completed" || event.item.status === "failed")
        ) {
          mcpAttempts += 1;
        }
      });
      try {
        const result = parsePublishResult(finalResponse);
        if (result.outcome === "blocked") {
          if (!result.blockingReason?.trim()) {
            throw new Error("Blocked result requires a blocking reason");
          }
          if (shouldRetryBlockedResult(rejectedBlockedResults, mcpAttempts)) {
            rejectedBlockedResults += 1;
            const message = `Codex blocked result rejected: ${result.blockingReason}`;
            pushLog(job, `${message}; continuing recovery`, { level: "WARN" });
            prompt = `${message}\nまだ未実行の作業があり、blockedは受理しない。最新snapshotを取得し、少なくとも1つ別のMCP操作で回復を試して作業を続行する。同じ説明だけでblockedを繰り返さない。`;
            continue;
          }
          throw new Error(`Codex reported publish prep blocked: ${result.blockingReason}`);
        }
        rejectedBlockedResults = 0;
        const validationErrors = validatePublishPrepResult(result, {
          videoPath,
          videoTitle: videoMeta.title,
          thumbnailTime: videoMeta.thumbnailTime,
          parentWorkIds,
        });
        if (validationErrors.length > 0) {
          throw new Error(`Publish prep verification failed: ${validationErrors.join("; ")}`);
        }
        pushLog(
          job,
          `Publish prep verified: title=${result.actualVideoTitle} thumbnail=${result.actualThumbnailTime} parentWorks=${result.registeredParentWorkIds.length} confirmation=${result.reachedConfirmation}`,
        );
        return {
          url: result.url,
          title: result.title,
          finalResponse: result.finalResponse,
          videoPath: result.videoPath,
          reachedConfirmation: result.reachedConfirmation,
          finalSubmitClicked: result.finalSubmitClicked,
          actualVideoTitle: result.actualVideoTitle,
          actualThumbnailTime: result.actualThumbnailTime,
          registeredParentWorkIds: result.registeredParentWorkIds,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith("Codex reported publish prep blocked:")
        ) {
          throw error;
        }
        const message = stringifyForLog(error);
        pushLog(job, `Codex result needs recovery: ${message}`, { level: "WARN" });
        prompt = `前のターンの最終結果は受理できなかった: ${message}\n現在のブラウザー状態をsnapshotで確認し、必要な作業を続行して、JSON Schemaどおりに再回答する。`;
      }
    }
  } finally {
    guard.stop();
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
      `Niconico parent works: ${parentWorks.map((work) => `${work.title}: ${work.url}`).join(" | ")}`,
    );
  }

  const startedAt = Date.now();
  const result = await runCodexPublishPrep(job, videoPath, videoMeta, parentWorks);
  pushLog(job, `Niconico browser phase completed in ${Date.now() - startedAt}ms`);
  if (getJobRuntimeStore().get(job.id)?.controller.signal.aborted) {
    throw new Error("Job was canceled");
  }
  updateJob(job, { status: "succeeded", result });
  pushLog(job, "Niconico publish prep succeeded");
  return result;
}

export async function cancelPublishPrepJob(jobId: string): Promise<PublishPrepJob> {
  const job = getJobStore().get(jobId);
  if (!job) throw new Error("Job not found");
  if (job.status === "succeeded" || job.status === "failed" || job.status === "canceled") {
    return job;
  }

  updateJob(job, { status: "canceled", error: "Canceled by user" });
  pushLog(job, "Cancel requested by user");
  getJobRuntimeStore().get(jobId)?.controller.abort(new Error("Canceled by user"));
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
  updateJob(job, { status: "failed", error: message });
  pushLog(job, `failed: ${message}`, { level: "ERROR" });
}

export function getPublishPrepJob(jobId: string) {
  return getJobStore().get(jobId);
}

export function getActivePublishJob() {
  for (const jobId of getJobRuntimeStore().keys()) {
    const job = getJobStore().get(jobId);
    if (job) return job;
  }
  return [...getJobStore().values()].find(
    (job) => job.status === "queued" || job.status === "running",
  );
}
