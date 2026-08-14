import type {
  CopyProjectRequest,
  CreateProjectRequest,
  DraftProject,
  ProjectFileSummary,
  SavedProject,
} from "@/_schemas";
import { api } from "@/_shared/lib/api-client";
import { parseApiJson } from "@/_shared/lib/fetch-json";
import { encodeProjectPathParam } from "@/app/features/project/lib/project-path";

export const projectKeys = {
  list: () => ["projects"] as const,
  detail: (projectPath: string) => ["project", projectPath] as const,
};

export async function fetchProjects() {
  return parseApiJson<ProjectFileSummary[]>(await api.projects.$get());
}

export async function fetchProject(projectPath: string) {
  const encodedPath = encodeProjectPathParam(projectPath);
  return parseApiJson<SavedProject>(
    await api.project[":projectPath{.+}"].$get({
      param: { projectPath: encodedPath },
    }),
  );
}

export async function saveProject(projectPath: string, project: DraftProject) {
  const encodedPath = encodeProjectPathParam(projectPath);
  return parseApiJson<SavedProject>(
    await api.project[":projectPath{.+}"].$post({
      param: { projectPath: encodedPath },
      json: project,
    } as {
      json: DraftProject;
      param: { projectPath: string };
    }),
  );
}

export async function createProject(projectPath: string) {
  return parseApiJson<ProjectFileSummary>(
    await api.projects.$post({
      json: { projectPath },
    } as {
      json: CreateProjectRequest;
    }),
  );
}

export async function copyProject(sourceProjectPath: string, targetProjectPath: string) {
  return parseApiJson<ProjectFileSummary>(
    await api.projects.copy.$post({
      json: { sourceProjectPath, targetProjectPath },
    } as {
      json: CopyProjectRequest;
    }),
  );
}
