import { describe, expect, it, vi } from "vitest";
import { startOpenCodeEventLogging, type PublishPrepJob } from "../publish-opencode";

describe("startOpenCodeEventLogging", () => {
  it("stops waiting when the prompt guard aborts", async () => {
    const promptController = new AbortController();
    const subscribe = vi.fn(async (_input, options: { signal: AbortSignal }) => ({
      stream: {
        [Symbol.asyncIterator]() {
          return {
            next: () =>
              new Promise<IteratorResult<never>>((resolve) => {
                options.signal.addEventListener(
                  "abort",
                  () => resolve({ done: true, value: undefined }),
                  { once: true },
                );
              }),
          };
        },
      },
    }));
    const job: PublishPrepJob = {
      id: "timeout-test",
      status: "running",
      logs: [],
      logPath: "/tmp/unused-publish-opencode-test.log",
      createdAt: 0,
      updatedAt: 0,
    };
    const logger = await startOpenCodeEventLogging(
      job,
      { client: { event: { subscribe } } } as never,
      process.cwd(),
      "session-id",
      promptController.signal,
      vi.fn(),
      vi.fn(),
    );

    logger.beginPrompt();
    promptController.abort(new Error("prompt inactivity timeout"));

    await expect(logger.completion).rejects.toThrow("prompt inactivity timeout");
    await logger.stop();
  });
});
