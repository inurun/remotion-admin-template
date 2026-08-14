import { useCallback, useState, type SyntheticEvent } from "react";
import { toast } from "sonner";
import type { ProjectFileSummary } from "@/_schemas";
import { copyProject } from "@/app/features/project/api/project-api";
import { getProjectHref } from "@/app/features/project/lib/project-path";
import { useProject } from "@/app/features/project";

function getDefaultProjectPath(project: ProjectFileSummary) {
  return `${project.path}-copy`;
}

function getProjectActionErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Project action failed";
}

export function useDuplicateProjectDialog(project: ProjectFileSummary) {
  const { reloadProjects } = useProject();
  const [isPending, setIsPending] = useState(false);

  const submit = useCallback(
    async (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const targetProjectPath = String(formData.get("projectPath") ?? "").trim();
      if (!targetProjectPath) {
        return;
      }

      const promise = (async () => {
        setIsPending(true);

        try {
          const createdProject = await copyProject(project.path, targetProjectPath);
          await reloadProjects();
          window.location.href = getProjectHref(createdProject.path);
        } finally {
          setIsPending(false);
        }
      })();

      await toast.promise(promise, {
        loading: "複製中...",
        success: "Project を複製した。",
        error: getProjectActionErrorMessage,
      });
    },
    [project.path, reloadProjects],
  );

  return {
    defaultProjectPath: getDefaultProjectPath(project),
    isPending,
    submit,
  };
}
