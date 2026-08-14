import { Hono } from "hono";
import { getServerEnv } from "@/server/core/env";
import { jsonError } from "@/server/_shared/http";
import {
  InvalidProjectPathError,
  ProjectAlreadyExistsError,
  ProjectNotFoundError,
} from "@/server/_shared/storage";
import { copyProject, createProject, listProjects, loadProject, saveProject } from "./use-case";
import { projectContract } from "./contract";

function getProjectPath(pathParam: string | undefined) {
  const projectPath = pathParam?.trim();
  if (!projectPath) {
    throw new InvalidProjectPathError("Project path is required");
  }

  return decodeURIComponent(projectPath);
}

function getProjectErrorStatus(error: unknown) {
  if (error instanceof InvalidProjectPathError) {
    return 400;
  }

  if (error instanceof ProjectNotFoundError) {
    return 404;
  }

  if (error instanceof ProjectAlreadyExistsError) {
    return 409;
  }

  return 500;
}

const PROJECT_ERROR_MESSAGES = {
  400: "Invalid project path",
  404: "Project not found",
  409: "Project already exists",
} as const;

function getFallbackProjectErrorMessage(action: "copy" | "create" | "load" | "save" | "list") {
  return action === "list" ? "Failed to list projects" : `Failed to ${action} project`;
}

function getProjectErrorMessage(
  status: number,
  action: "copy" | "create" | "load" | "save" | "list",
) {
  return (
    PROJECT_ERROR_MESSAGES[status as keyof typeof PROJECT_ERROR_MESSAGES] ??
    getFallbackProjectErrorMessage(action)
  );
}

export const projectApp = new Hono()
  .get("/projects", async (c) => {
    try {
      return c.json(projectContract.list.response.parse(await listProjects()));
    } catch (error) {
      const status = getProjectErrorStatus(error);
      return jsonError(c, status, error, getProjectErrorMessage(status, "list"));
    }
  })
  .post("/projects", async (c) => {
    try {
      const json = projectContract.create.json.parse(await c.req.json());
      return c.json(projectContract.create.response.parse(await createProject(json.projectPath)));
    } catch (error) {
      const status = getProjectErrorStatus(error);
      return jsonError(c, status, error, getProjectErrorMessage(status, "create"));
    }
  })
  .post("/projects/copy", async (c) => {
    try {
      const json = projectContract.copy.json.parse(await c.req.json());
      return c.json(
        projectContract.copy.response.parse(
          await copyProject(json.sourceProjectPath, json.targetProjectPath),
        ),
      );
    } catch (error) {
      const status = getProjectErrorStatus(error);
      return jsonError(c, status, error, getProjectErrorMessage(status, "copy"));
    }
  })
  .get("/project/:projectPath{.+}", async (c) => {
    try {
      const projectPath = getProjectPath(c.req.param("projectPath"));
      return c.json(projectContract.get.response.parse(await loadProject(projectPath)));
    } catch (error) {
      const status = getProjectErrorStatus(error);
      return jsonError(c, status, error, getProjectErrorMessage(status, "load"));
    }
  })
  .post("/project/:projectPath{.+}", async (c) => {
    try {
      const projectPath = getProjectPath(c.req.param("projectPath"));
      const json = projectContract.save.json.parse(await c.req.json());
      return c.json(
        projectContract.save.response.parse(await saveProject(getServerEnv(c), projectPath, json)),
      );
    } catch (error) {
      const status = getProjectErrorStatus(error);
      return jsonError(c, status, error, getProjectErrorMessage(status, "save"));
    }
  });
