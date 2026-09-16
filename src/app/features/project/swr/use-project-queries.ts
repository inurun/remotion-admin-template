import { toast } from "sonner";
import useSWR from "swr";
import { DEFAULT_PROJECT_META, DEFAULT_VOICE_PRESETS, EMPTY_TIMELINE } from "@/_schemas";
import type { SavedProject, SavedTimeline } from "@/_schemas";
import { fetchProject, fetchProjects, projectKeys } from "@/app/features/project/api/project-api";

export type ProjectDocument = {
  project: SavedProject;
  timeline: SavedTimeline;
};

const EMPTY_DOCUMENT: ProjectDocument = {
  project: {
    meta: DEFAULT_PROJECT_META,
    pages: [],
    bgm: [],
    voicePresets: DEFAULT_VOICE_PRESETS,
  },
  timeline: EMPTY_TIMELINE,
};

async function mutateProjectIfPresent(
  projectPath: string | null,
  mutate: ReturnType<typeof useSWR<ProjectDocument>>["mutate"],
  document?: ProjectDocument,
) {
  if (!projectPath) {
    return;
  }

  if (document) {
    await mutate(document, { revalidate: false });
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

  const document = data ?? EMPTY_DOCUMENT;

  return {
    project: document.project,
    timeline: document.timeline,
    hasData: Boolean(data),
    mutateProject: async (next: ProjectDocument | SavedProject) => {
      const payload =
        "timeline" in next && "project" in next
          ? next
          : { project: next, timeline: document.timeline };
      await mutateProjectIfPresent(projectPath, mutate, payload);
    },
    reloadProject: async () => {
      await mutateProjectIfPresent(projectPath, mutate);
    },
  };
}
