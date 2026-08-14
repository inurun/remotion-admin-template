import { type SyntheticEvent, useCallback, useState } from "react";
import { toast } from "sonner";
import { createProject } from "@/app/features/project/api/project-api";
import { getProjectHref } from "@/app/features/project/lib/project-path";
import { useProject } from "@/app/features/project";

const DEFAULT_PROJECT_PATH = "untitled";

function getProjectActionErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Project action failed";
}

export function useAddProjectDialog() {
  const { reloadProjects } = useProject();
  const [isPending, setIsPending] = useState(false);

  const submit = useCallback(
    async (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const projectPath = String(formData.get("projectPath") ?? "").trim();
      if (!projectPath) {
        return;
      }

      const promise = (async () => {
        setIsPending(true);

        try {
          const project = await createProject(projectPath);
          await reloadProjects();
          window.location.href = getProjectHref(project.path);
        } finally {
          setIsPending(false);
        }
      })();

      await toast.promise(promise, {
        loading: "作成中...",
        success: "Project を作成した。",
        error: getProjectActionErrorMessage,
      });
    },
    [reloadProjects],
  );

  return {
    defaultProjectPath: DEFAULT_PROJECT_PATH,
    isPending,
    submit,
  };
}
