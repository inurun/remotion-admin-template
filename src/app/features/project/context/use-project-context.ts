import type { ProjectFileSummary, SavedProject } from "@/_schemas";
import { getProjectPathFromLocation } from "@/app/features/project/lib/project-path";
import {
  useProjectsQuery,
  useSelectedProjectQuery,
} from "@/app/features/project/swr/use-project-queries";

export type ProjectContextValue = {
  projects: ProjectFileSummary[];
  projectPath: string | null;
  project: SavedProject;
  reloadProjects: () => Promise<void>;
  mutateProject: (project: SavedProject) => Promise<void>;
  reloadProject: () => Promise<void>;
};

export function useProjectProviderValue(): ProjectContextValue {
  const projectPath = getProjectPathFromLocation(window.location.pathname);

  const projects = useProjectsQuery();
  const selectedProject = useSelectedProjectQuery(projectPath);

  return {
    projectPath,
    ...projects,
    ...selectedProject,
  };
}
