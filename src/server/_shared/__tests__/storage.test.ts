import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  accessMock,
  mkdirMock,
  readFileMock,
  readdirMock,
  renameMock,
  rmMock,
  statMock,
  writeFileMock,
} = vi.hoisted(() => ({
  accessMock: vi.fn(),
  mkdirMock: vi.fn(),
  readFileMock: vi.fn(),
  readdirMock: vi.fn(),
  renameMock: vi.fn(),
  rmMock: vi.fn(),
  statMock: vi.fn(),
  writeFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    access: accessMock,
    mkdir: mkdirMock,
    readFile: readFileMock,
    readdir: readdirMock,
    rename: renameMock,
    rm: rmMock,
    stat: statMock,
    writeFile: writeFileMock,
  },
}));

describe("storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid project paths", async () => {
    const { InvalidProjectPathError, readSavedProject } = await import("../storage");

    await expect(readSavedProject("../bad")).rejects.toBeInstanceOf(InvalidProjectPathError);
  });

  it("throws ProjectNotFoundError when the project file is missing", async () => {
    const { ProjectNotFoundError, readSavedProject } = await import("../storage");
    readFileMock.mockRejectedValueOnce({ code: "ENOENT" });

    await expect(readSavedProject("missing")).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("creates the default project when no saved projects exist", async () => {
    readdirMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        isDirectory: () => false,
        isFile: () => true,
        name: "project.json",
      },
    ]);
    accessMock.mockRejectedValueOnce({ code: "ENOENT" });
    statMock.mockResolvedValueOnce({ mtimeMs: 42 });

    const { listSavedProjects } = await import("../storage");
    const projects = await listSavedProjects();

    expect(projects).toEqual([
      {
        path: "project",
        name: "project",
        segments: ["project"],
        updatedAt: 42,
      },
    ]);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });

  it("creates a new project and returns its summary", async () => {
    accessMock.mockRejectedValueOnce({ code: "ENOENT" });
    statMock.mockResolvedValueOnce({ mtimeMs: 42 });

    const { createSavedProject } = await import("../storage");
    const summary = await createSavedProject("nested/new", {
      meta: {
        title: "new",
        description: "",
        width: 1920,
        height: 1080,
        weather: {},
        niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
      },
      pages: [],
      bgm: [],
      voicePresets: [],
    });

    expect(summary).toEqual({
      path: "nested/new",
      name: "new",
      segments: ["nested", "new"],
      updatedAt: 42,
    });
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });

  it("rejects creating a project over an existing file", async () => {
    accessMock.mockResolvedValueOnce(undefined);

    const { createSavedProject, ProjectAlreadyExistsError } = await import("../storage");
    await expect(
      createSavedProject("project", {
        meta: {
          title: "project",
          description: "",
          width: 1920,
          height: 1080,
          weather: {},
          niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
        },
        pages: [],
        bgm: [],
        voicePresets: [],
      }),
    ).rejects.toBeInstanceOf(ProjectAlreadyExistsError);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("writes project JSON through unique temp files then rename", async () => {
    const { writeSavedProject, createProjectWriteTempPath } = await import("../storage");
    const first = createProjectWriteTempPath("/tmp/project.json");
    const second = createProjectWriteTempPath("/tmp/project.json");
    expect(first).not.toBe(second);
    expect(first).toMatch(/\/tmp\/project\.json\.\d+\.[0-9a-f-]+\.tmp$/);
    expect(second).toMatch(/\/tmp\/project\.json\.\d+\.[0-9a-f-]+\.tmp$/);

    await writeSavedProject("project", {
      meta: {
        title: "project",
        description: "",
        width: 1920,
        height: 1080,
        weather: {},
        niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
      },
      pages: [],
      bgm: [],
      voicePresets: [],
    });
    await writeSavedProject("project", {
      meta: {
        title: "project",
        description: "",
        width: 1920,
        height: 1080,
        weather: {},
        niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
      },
      pages: [],
      bgm: [],
      voicePresets: [],
    });

    expect(writeFileMock).toHaveBeenCalledTimes(2);
    const tempPaths = writeFileMock.mock.calls.map((call) => String(call[0]));
    expect(tempPaths[0]).not.toBe(tempPaths[1]);
    expect(tempPaths[0]).toMatch(/\.tmp$/);
    expect(renameMock).toHaveBeenCalledTimes(2);
  });

  it("does not replace the original file when the temp write fails", async () => {
    writeFileMock.mockRejectedValueOnce(new Error("disk full"));
    const { writeSavedProject } = await import("../storage");

    await expect(
      writeSavedProject("project", {
        meta: {
          title: "project",
          description: "",
          width: 1920,
          height: 1080,
          weather: {},
          niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
        },
        pages: [],
        bgm: [],
        voicePresets: [],
      }),
    ).rejects.toThrow("disk full");
    expect(renameMock).not.toHaveBeenCalled();
    expect(rmMock).toHaveBeenCalled();
  });

  it("maps a project path to the data file stem and output video path", async () => {
    const { OUT_DIR, getProjectFileStem, getProjectOutputVideoPath } = await import("../storage");

    expect(getProjectFileStem("example")).toBe("example");
    expect(getProjectFileStem("nested/example")).toBe("example");
    expect(getProjectOutputVideoPath("nested/example")).toBe(path.join(OUT_DIR, "example.mp4"));
  });

  it("excludes schedules.json from the project list", async () => {
    readdirMock.mockResolvedValueOnce([
      {
        isDirectory: () => false,
        isFile: () => true,
        name: "schedules.json",
      },
      {
        isDirectory: () => false,
        isFile: () => true,
        name: "project.json",
      },
    ]);
    statMock.mockResolvedValueOnce({ mtimeMs: 42 });

    const { listSavedProjects } = await import("../storage");
    const projects = await listSavedProjects();

    expect(projects).toEqual([
      {
        path: "project",
        name: "project",
        segments: ["project"],
        updatedAt: 42,
      },
    ]);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("creates an empty schedules file when none exists", async () => {
    readFileMock.mockRejectedValueOnce({ code: "ENOENT" });

    const { readSavedSchedules } = await import("../storage");
    await expect(readSavedSchedules()).resolves.toEqual({ items: [] });
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(renameMock).toHaveBeenCalledTimes(1);
  });

  it("writes schedules JSON through unique temp files then rename", async () => {
    const { writeSavedSchedules } = await import("../storage");
    await writeSavedSchedules({
      items: [
        {
          id: "schedule-1",
          date: "2026-08-18",
          color: "#3b82f6",
          title: "Release",
          description: "",
        },
      ],
    });

    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(String(writeFileMock.mock.calls[0]?.[0])).toMatch(
      /schedules\.json\.\d+\.[0-9a-f-]+\.tmp$/,
    );
    expect(renameMock).toHaveBeenCalledTimes(1);
  });
});
