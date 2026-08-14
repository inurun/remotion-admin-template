import { describe, expect, it, vi } from "vitest";
import { projectApp } from "../route";
import {
  InvalidProjectPathError,
  ProjectAlreadyExistsError,
  ProjectNotFoundError,
} from "@/server/_shared/storage";

const { copyProjectMock, createProjectMock, listProjectsMock, loadProjectMock, saveProjectMock } =
  vi.hoisted(() => ({
    copyProjectMock: vi.fn(),
    createProjectMock: vi.fn(),
    listProjectsMock: vi.fn(),
    loadProjectMock: vi.fn(),
    saveProjectMock: vi.fn(),
  }));

vi.mock("../use-case", () => ({
  copyProject: copyProjectMock,
  createProject: createProjectMock,
  listProjects: listProjectsMock,
  loadProject: loadProjectMock,
  saveProject: saveProjectMock,
}));

describe("project routes", () => {
  it("lists projects", async () => {
    listProjectsMock.mockResolvedValueOnce([
      { path: "project", name: "project", segments: ["project"], updatedAt: 1 },
    ]);

    const response = await projectApp.request("/projects");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { path: "project", name: "project", segments: ["project"], updatedAt: 1 },
    ]);
  });

  it("loads a nested project", async () => {
    loadProjectMock.mockResolvedValueOnce({ pages: [] });

    const response = await projectApp.request("/project/nested/example");
    expect(response.status).toBe(200);
    expect(loadProjectMock).toHaveBeenCalledWith("nested/example");
  });

  it("creates a project", async () => {
    createProjectMock.mockResolvedValueOnce({
      path: "new",
      name: "new",
      segments: ["new"],
      updatedAt: 1,
    });

    const response = await projectApp.request("/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectPath: "new" }),
    });

    expect(response.status).toBe(200);
    expect(createProjectMock).toHaveBeenCalledWith("new");
    expect(await response.json()).toEqual({
      path: "new",
      name: "new",
      segments: ["new"],
      updatedAt: 1,
    });
  });

  it("copies a project", async () => {
    copyProjectMock.mockResolvedValueOnce({
      path: "copy",
      name: "copy",
      segments: ["copy"],
      updatedAt: 1,
    });

    const response = await projectApp.request("/projects/copy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sourceProjectPath: "source", targetProjectPath: "copy" }),
    });

    expect(response.status).toBe(200);
    expect(copyProjectMock).toHaveBeenCalledWith("source", "copy");
  });

  it("returns not found for missing project", async () => {
    loadProjectMock.mockRejectedValueOnce(new ProjectNotFoundError("missing"));

    const response = await projectApp.request("/project/missing");
    expect(response.status).toBe(404);
  });

  it("returns conflict when creating an existing project", async () => {
    createProjectMock.mockRejectedValueOnce(new ProjectAlreadyExistsError("exists"));

    const response = await projectApp.request("/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectPath: "project" }),
    });

    expect(response.status).toBe(409);
  });

  it("returns bad request for missing path", async () => {
    saveProjectMock.mockRejectedValueOnce(new InvalidProjectPathError("bad"));

    const response = await projectApp.request("/project/bad.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pages: [] }),
    });
    expect(response.status).toBe(400);
  });
});
