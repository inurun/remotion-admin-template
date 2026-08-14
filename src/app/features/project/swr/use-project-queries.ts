import { toast } from "sonner";
import useSWR from "swr";
import type { SavedProject } from "@/_schemas";
import { getDefaultProjectMeta } from "@/_shared/project/project-meta";
import { fetchProject, fetchProjects, projectKeys } from "@/app/features/project/api/project-api";

async function mutateProjectIfPresent(
  projectPath: string | null,
  mutate: ReturnType<typeof useSWR<SavedProject>>["mutate"],
  project?: SavedProject,
) {
  if (!projectPath) {
    return;
  }

  if (project) {
    await mutate(project, { revalidate: false });
    return;
  }

  await mutate();
}

export function useProjectsQuery() {
  const { data, mutate } = useSWR(projectKeys.list(), fetchProjects, {
    revalidateOnFocus: false,
    onError(err, key, config) {
      console.error(err, key, config);
      toast.error("Projects loading failed");
    },
  });

  return {
    projects: data ?? [],
    reloadProjects: async () => {
      await mutate();
    },
  };
}

export function useSelectedProjectQuery(projectPath: string | null) {
  const { data, mutate } = useSWR(
    projectPath ? projectKeys.detail(projectPath) : null,
    () => fetchProject(projectPath!),
    {
      revalidateOnFocus: false,
      onError(err, key, config) {
        console.error(err, key, config);
        toast.error("Project loading failed");
      },
    },
  );

  return {
    project: data ?? { meta: getDefaultProjectMeta(), pages: [], bgm: [] },
    mutateProject: async (project: SavedProject) => {
      await mutateProjectIfPresent(projectPath, mutate, project);
    },
    reloadProject: async () => {
      await mutateProjectIfPresent(projectPath, mutate);
    },
  };
}
