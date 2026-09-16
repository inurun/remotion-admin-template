import type { ProjectFileSummary } from "@/server/features/project/contract";
import { useProjectRoute } from "@/app/features/project/context/project-route-context";
import { useProjectsQuery } from "@/app/features/project/swr/use-project-queries";

export type ProjectContextValue = {
  projects: ProjectFileSummary[];
  projectPath: string | null;
  reloadProjects: () => Promise<void>;
};

export function useProjectProviderValue(): ProjectContextValue {
  const { projectPath } = useProjectRoute();
  const projects = useProjectsQuery();

  return {
    projectPath,
    ...projects,
  };
}
