import type {
  CopyProjectRequest,
  CreateProjectRequest,
  ProjectFileSummary,
  SavedProject,
} from "@/_schemas";
import { api } from "@/_shared/lib/api-client";
import { parseApiJson } from "@/_shared/lib/fetch-json";
import { encodeProjectPathParam } from "@/app/features/project/lib/project-path";
import type { SaveProjectChangesInput } from "@/app/features/editor/store/editor-session-state";
import type { SaveProjectResult } from "@/app/features/editor/store/saved-project-state";

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

export async function saveProjectChanges(projectPath: string, changeSet: SaveProjectChangesInput) {
  const encodedPath = encodeProjectPathParam(projectPath);
  return parseApiJson<SaveProjectResult>(
    await api.project[":projectPath{.+}"].$post({
      param: { projectPath: encodedPath },
      json: changeSet,
    } as {
      json: SaveProjectChangesInput;
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
