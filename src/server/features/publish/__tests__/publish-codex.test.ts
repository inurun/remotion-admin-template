import type { ThreadEvent } from "@openai/codex-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validatePublishPrepResult } from "../niconico-publish";
import {
  consumeCodexEvents,
  createPublishAbortGuard,
  createPublishCodexOptions,
  createPublishThreadOptions,
  parsePublishResult,
  PUBLISH_RESULT_SCHEMA,
  type PublishPrepJob,
} from "../publish-codex";

function createJob(): PublishPrepJob {
  return {
    id: crypto.randomUUID(),
    status: "running",
    logs: [],
    logPath: `/tmp/publish-codex-${crypto.randomUUID()}.log`,
    createdAt: 0,
    updatedAt: 0,
  };
}

async function* stream(events: ThreadEvent[]) {
  yield* events;
}

const usage = {
  input_tokens: 10,
  cached_input_tokens: 2,
  cache_write_input_tokens: 0,
  output_tokens: 4,
  reasoning_output_tokens: 1,
};

describe("publish Codex configuration", () => {
  it("pins the model, reasoning, sandbox, and agent-browser MCP", () => {
    expect(createPublishThreadOptions("/repo")).toEqual({
      model: "gpt-5.6-luna",
      modelReasoningEffort: "low",
      sandboxMode: "read-only",
      approvalPolicy: "never",
      workingDirectory: "/repo",
      networkAccessEnabled: false,
      webSearchMode: "disabled",
    });
    expect(createPublishCodexOptions("/repo")).toMatchObject({
      config: {
        features: {
          shell_tool: false,
        },
        mcp_servers: {
          agent_browser: {
            command: "pnpm",
            args: [
              "--dir",
              "/repo",
              "exec",
              "agent-browser",
              "--session",
              "niconico-publish",
              "--cdp",
              "9222",
              "mcp",
              "--tools",
              "all",
            ],
            default_tools_approval_mode: "approve",
            enabled_tools: expect.arrayContaining([
              "agent_browser_snapshot",
              "agent_browser_upload",
              "agent_browser_eval",
            ]),
          },
        },
      },
    });
    expect(PUBLISH_RESULT_SCHEMA.additionalProperties).toBe(false);
  });
});

describe("consumeCodexEvents", () => {
  it("logs MCP progress and returns the structured final response", async () => {
    const job = createJob();
    const result = JSON.stringify({ ok: true });
    const activity = vi.fn();

    await expect(
      consumeCodexEvents(
        job,
        stream([
          { type: "thread.started", thread_id: "thread-1" },
          {
            type: "item.started",
            item: {
              id: "tool-1",
              type: "mcp_tool_call",
              server: "agent_browser",
              tool: "agent_browser_snapshot",
              arguments: {},
              status: "in_progress",
            },
          },
          {
            type: "item.completed",
            item: {
              id: "tool-1",
              type: "mcp_tool_call",
              server: "agent_browser",
              tool: "agent_browser_snapshot",
              arguments: {},
              result: { content: [], structured_content: {} },
              status: "completed",
            },
          },
          {
            type: "item.completed",
            item: { id: "message-1", type: "agent_message", text: result },
          },
          { type: "turn.completed", usage },
        ]),
        activity,
      ),
    ).resolves.toBe(result);
    expect(activity).toHaveBeenCalledTimes(5);
    expect(job.logs.some((line) => line.includes("agent_browser_snapshot: completed"))).toBe(true);
  });

  it("keeps consuming after a failed MCP call so Codex can recover", async () => {
    const job = createJob();
    const result = JSON.stringify({ ok: true });

    await expect(
      consumeCodexEvents(
        job,
        stream([
          {
            type: "item.completed",
            item: {
              id: "tool-1",
              type: "mcp_tool_call",
              server: "agent_browser",
              tool: "agent_browser_click",
              arguments: {},
              error: { message: "click failed" },
              status: "failed",
            },
          },
          {
            type: "item.completed",
            item: { id: "message-1", type: "agent_message", text: result },
          },
          { type: "turn.completed", usage },
        ]),
      ),
    ).resolves.toBe(result);
    expect(job.logs.some((line) => line.includes("[WARN]") && line.includes("click failed"))).toBe(
      true,
    );
  });

  it.each([
    {
      name: "shell execution",
      event: {
        type: "item.started",
        item: {
          id: "command-1",
          type: "command_execution",
          command: "pwd",
          aggregated_output: "",
          status: "in_progress",
        },
      } satisfies ThreadEvent,
      error: "forbidden command_execution",
    },
    {
      name: "file change",
      event: {
        type: "item.completed",
        item: { id: "file-1", type: "file_change", changes: [], status: "completed" },
      } satisfies ThreadEvent,
      error: "forbidden file_change",
    },
    {
      name: "stream error",
      event: { type: "error", message: "stream failed" } satisfies ThreadEvent,
      error: "stream failed",
    },
    {
      name: "foreign MCP server",
      event: {
        type: "item.started",
        item: {
          id: "tool-2",
          type: "mcp_tool_call",
          server: "other_server",
          tool: "other_tool",
          arguments: {},
          status: "in_progress",
        },
      } satisfies ThreadEvent,
      error: "forbidden MCP server",
    },
    {
      name: "turn failure",
      event: { type: "turn.failed", error: { message: "model failed" } } satisfies ThreadEvent,
      error: "model failed",
    },
  ])("fails closed on $name", async ({ event, error }) => {
    await expect(consumeCodexEvents(createJob(), stream([event]))).rejects.toThrow(error);
  });
});

describe("publish result and abort guard", () => {
  afterEach(() => vi.useRealTimers());

  it("rejects invalid JSON", () => {
    expect(() => parsePublishResult("not json")).toThrow("invalid JSON");
    expect(() => parsePublishResult("{}")).toThrow("invalid publish result");
  });

  it("parses a structured result that passes the existing verification", () => {
    const expected = {
      videoPath: "/repo/out/project.mp4",
      videoTitle: "title",
      thumbnailTime: "00:12.345",
      parentWorkIds: ["sm1", "sm2"],
    };
    const result = parsePublishResult(
      JSON.stringify({
        outcome: "ready",
        blockingReason: null,
        url: "https://garage.nicovideo.jp/niconico-garage/video/videos/123",
        title: "投稿の確認",
        finalResponse: "ready",
        videoPath: expected.videoPath,
        reachedConfirmation: true,
        finalSubmitClicked: false,
        actualVideoTitle: expected.videoTitle,
        actualThumbnailTime: expected.thumbnailTime,
        registeredParentWorkIds: ["sm2", "sm1"],
      }),
    );

    expect(validatePublishPrepResult(result, expected)).toEqual([]);
  });

  it("aborts on inactivity and parent cancellation", () => {
    vi.useFakeTimers();
    const parent = new AbortController();
    const inactivityGuard = createPublishAbortGuard(parent.signal, 1_000, 100);
    vi.advanceTimersByTime(100);
    expect(inactivityGuard.signal.aborted).toBe(true);
    expect(inactivityGuard.signal.reason).toEqual(
      expect.objectContaining({ message: expect.stringContaining("no activity") }),
    );
    inactivityGuard.stop();

    const canceledParent = new AbortController();
    const cancelGuard = createPublishAbortGuard(canceledParent.signal, 1_000, 100);
    canceledParent.abort(new Error("Canceled by user"));
    expect(cancelGuard.signal.aborted).toBe(true);
    expect(cancelGuard.signal.reason).toEqual(
      expect.objectContaining({ message: "Canceled by user" }),
    );
    cancelGuard.stop();
  });

  it("aborts on the hard timeout", () => {
    vi.useFakeTimers();
    const guard = createPublishAbortGuard(new AbortController().signal, 100, 1_000);
    vi.advanceTimersByTime(100);
    expect(guard.signal.aborted).toBe(true);
    expect(guard.signal.reason).toEqual(
      expect.objectContaining({ message: expect.stringContaining("hard timeout") }),
    );
    guard.stop();
  });
});
