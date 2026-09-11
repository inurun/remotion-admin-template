import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enqueueProjectMutation,
  resetProjectMutationQueueForTests,
} from "@/server/features/project/project-mutation-queue";
import { resetRenderStateForTests, startRender } from "../render-state";

const readSavedProjectMock = vi.fn();
const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

vi.mock("@/server/_shared/storage", async () => {
  const actual = await vi.importActual<typeof import("@/server/_shared/storage")>(
    "@/server/_shared/storage",
  );
  return {
    ...actual,
    readSavedProject: (...args: unknown[]) => readSavedProjectMock(...args),
  };
});

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    rm: vi.fn(),
    copyFile: vi.fn(),
  },
}));

function createFakeChild() {
  return {
    pid: 1,
    stdout: null,
    stderr: null,
    on: vi.fn(),
    kill: vi.fn(),
  };
}

const readyProject = {
  pages: [
    {
      id: "page-1",
      type: "main",
      tts: [{ audio: { status: "ready", src: "/tts/a.wav", durationSec: 1 } }],
    },
  ],
};

const pendingProject = {
  pages: [
    {
      id: "page-1",
      type: "main",
      tts: [{ audio: { status: "pending", src: "/tts/a.wav" } }],
    },
  ],
};

afterEach(() => {
  resetProjectMutationQueueForTests();
  resetRenderStateForTests();
  readSavedProjectMock.mockReset();
  spawnMock.mockReset();
});

describe("startRender project queue", () => {
  it("waits for an in-flight save before inspecting pending tts", async () => {
    let releaseSave!: () => void;
    const saveGate = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const save = enqueueProjectMutation("render-queue-project", async () => {
      await saveGate;
    });

    readSavedProjectMock.mockResolvedValue(pendingProject);

    const started = startRender("render-queue-project");
    await Promise.resolve();
    expect(readSavedProjectMock).not.toHaveBeenCalled();

    releaseSave();
    await save;
    await expect(started).resolves.toEqual({
      started: false,
      reason: "tts_pending",
    });
    expect(readSavedProjectMock).toHaveBeenCalledTimes(1);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("rejects a second start from a different project while the first is starting", async () => {
    let releaseRead!: () => void;
    const readGate = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    readSavedProjectMock.mockImplementation(async () => {
      await readGate;
      return readyProject;
    });
    spawnMock.mockImplementation(createFakeChild);

    const first = startRender("project-a");
    const second = startRender("project-b");
    await Promise.resolve();
    await Promise.resolve();

    expect(readSavedProjectMock).toHaveBeenCalledTimes(1);
    expect(readSavedProjectMock).toHaveBeenCalledWith("project-a");

    releaseRead();
    await expect(Promise.all([first, second])).resolves.toEqual([
      { started: true },
      { started: false, reason: "already_running" },
    ]);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });
});
