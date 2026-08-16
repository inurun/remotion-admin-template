import { useCallback, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import type { DraftProject } from "@/_schemas";
import { getErrorMessage } from "@/_shared/lib/error-message";
import { saveProject } from "@/app/features/project/api/project-api";
import { useProject } from "@/app/features/project";

type EditorContextValue = {
  isPending: boolean;
  save: () => Promise<void>;
};

export function useEditorProviderValue(): EditorContextValue {
  const form = useFormContext<DraftProject>();
  const { projectPath, mutateProject } = useProject();
  const [isPending, setSaving] = useState(false);

  const saveCurrentProject = useCallback(
    async (draftProject: DraftProject) => {
      if (!projectPath) {
        throw new Error("Project path is required");
      }

      const savePromise = (async () => {
        setSaving(true);

        try {
          const savedProject = await saveProject(projectPath, draftProject);
          await mutateProject(savedProject);
        } finally {
          setSaving(false);
        }
      })();

      await toast.promise(savePromise, {
        loading: "保存中...",
        success: "保存して音声を更新した。",
        error: (error) => getErrorMessage(error, "Save failed"),
      });
    },
    [mutateProject, projectPath],
  );

  return {
    isPending,
    save: form.handleSubmit(saveCurrentProject),
  };
}
