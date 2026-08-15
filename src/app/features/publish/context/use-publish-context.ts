import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import type { DraftProject } from "@/_schemas";
import { saveProject } from "@/app/features/project/api/project-api";
import { useEditor } from "@/app/features/editor";
import { usePage } from "@/app/features/page";
import { useProject } from "@/app/features/project";
import { startPublish } from "@/app/features/publish/api/publish-api";
import { usePublishStateQuery } from "@/app/features/publish/swr/use-publish-query";
import type { RenderState } from "@/app/features/render/api/render-api";
import { useSettings } from "@/app/features/settings";

export type PublishContextValue = {
  alsoPublish: boolean;
  publishState: ReturnType<typeof usePublishStateQuery>["publishState"];
  publishError: string | null;
  publishExecuteDisabled: boolean;
  publishExecuteLabel: string;
  setAlsoPublish: (value: boolean) => void;
  watchRenderForPublish: (renderState: RenderState) => void;
  armPublishAfterRender: () => void;
  resetPublishWatch: () => void;
  handlePublishExecute: () => void;
};

function getPublishExecuteLabel(
  saving: boolean,
  status: ReturnType<typeof usePublishStateQuery>["publishState"]["status"],
) {
  if (saving) {
    return "Saving";
  }

  if (status === "running") {
    return "Publishing";
  }

  return "Publish";
}

export function usePublishProviderValue(): PublishContextValue {
  const { handleSubmit } = useFormContext<DraftProject>();
  const { isPending: saving } = useEditor();
  const { options } = useSettings();
  const { pageFields } = usePage();
  const { projectPath } = useProject();
  const { publishState, reloadPublishState } = usePublishStateQuery();
  const [alsoPublish, setAlsoPublish] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const intendPublishRef = useRef(false);
  const waitingForRenderSuccessRef = useRef(false);
  const publishStartedForRenderRef = useRef(false);

  const startPublishJob = useCallback(async () => {
    if (!projectPath) {
      throw new Error("Project path is required");
    }

    await startPublish(projectPath);
    void reloadPublishState();
  }, [projectPath, reloadPublishState]);

  const resetPublishWatch = useCallback(() => {
    intendPublishRef.current = false;
    waitingForRenderSuccessRef.current = false;
    publishStartedForRenderRef.current = false;
  }, []);

  const armPublishAfterRender = useCallback(() => {
    intendPublishRef.current = alsoPublish;
    waitingForRenderSuccessRef.current = false;
    publishStartedForRenderRef.current = false;
  }, [alsoPublish]);

  const watchRenderForPublish = useCallback(
    (renderState: RenderState) => {
      if (!intendPublishRef.current) {
        return;
      }

      if (renderState.status === "running") {
        waitingForRenderSuccessRef.current = true;
        publishStartedForRenderRef.current = false;
        return;
      }

      if (
        waitingForRenderSuccessRef.current &&
        renderState.status === "success" &&
        !publishStartedForRenderRef.current
      ) {
        publishStartedForRenderRef.current = true;
        waitingForRenderSuccessRef.current = false;
        intendPublishRef.current = false;
        void startPublishJob()
          .then(() => {
            toast.success("Publish を開始した。");
          })
          .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : "Publish start failed");
          });
      }

      if (renderState.status === "error") {
        waitingForRenderSuccessRef.current = false;
        intendPublishRef.current = false;
      }
    },
    [startPublishJob],
  );

  useEffect(() => {
    if (!alsoPublish) {
      resetPublishWatch();
    }
  }, [alsoPublish, resetPublishWatch]);

  const canSave = options.length > 0 && !saving && pageFields.length > 0;
  const publishExecuteDisabled = !canSave || publishState.status === "running";
  const publishExecuteLabel = getPublishExecuteLabel(saving, publishState.status);

  const handlePublishExecute = useCallback(() => {
    setPublishError(null);
    resetPublishWatch();
    void handleSubmit(async (draftProject) => {
      try {
        if (!projectPath) {
          throw new Error("Project path is required");
        }

        await toast.promise(saveProject(projectPath, draftProject), {
          loading: "保存中...",
          success: "保存して音声を更新した。",
          error: "Save failed",
        });
      } catch (error) {
        setPublishError(JSON.stringify(error));
        return;
      }

      try {
        await startPublishJob();
        toast.success("Publish を開始した。");
      } catch (error) {
        setPublishError(error instanceof Error ? error.message : JSON.stringify(error));
      }
    })();
  }, [handleSubmit, projectPath, resetPublishWatch, startPublishJob]);

  return {
    alsoPublish,
    publishState,
    publishError,
    publishExecuteDisabled,
    publishExecuteLabel,
    setAlsoPublish,
    watchRenderForPublish,
    armPublishAfterRender,
    resetPublishWatch,
    handlePublishExecute,
  };
}
