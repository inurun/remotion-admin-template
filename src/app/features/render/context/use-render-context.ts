import { useCallback, useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import type { DraftProject } from "@/_schemas";
import { saveProject } from "@/app/features/project/api/project-api";
import { useEditor } from "@/app/features/editor";
import { usePage } from "@/app/features/page";
import { useProject } from "@/app/features/project";
import { usePublish } from "@/app/features/publish";
import { startRender, type RenderState } from "@/app/features/render/api/render-api";
import { useRenderStateQuery } from "@/app/features/render/swr/use-render-query";
import { resolveProjectSynthesisSettings } from "@/_shared/project/voice-presets";
import { useSettings } from "@/app/features/settings";

export type { RenderState };

export type DialogJobPhase = "render" | "publish";

function getRenderExecuteLabel(
  saving: boolean,
  renderStatus: RenderState["status"],
  publishStatus: "error" | "idle" | "running" | "success",
  alsoPublish: boolean,
) {
  if (saving) {
    return "Saving";
  }

  if (renderStatus === "running") {
    return "Rendering";
  }

  if (alsoPublish && publishStatus === "running") {
    return "Publishing";
  }

  return "Render";
}

export type RenderContextValue = {
  alsoPublish: boolean;
  dialogJobPhase: DialogJobPhase;
  renderState: RenderState;
  publishState: ReturnType<typeof usePublish>["publishState"];
  publishError: string | null;
  publishExecuteDisabled: boolean;
  publishExecuteLabel: string;
  renderDialogOpen: boolean;
  renderError: string | null;
  renderExecuteDisabled: boolean;
  renderExecuteLabel: string;
  openRenderDialog: () => void;
  setAlsoPublish: (value: boolean) => void;
  setRenderDialogOpen: (open: boolean) => void;
  handleRenderExecute: () => void;
  handlePublishExecute: () => void;
};

export function useRenderProviderValue(): RenderContextValue {
  const { handleSubmit } = useFormContext<DraftProject>();
  const { isPending: saving } = useEditor();
  const { options } = useSettings();
  const { pageFields } = usePage();
  const { projectPath } = useProject();
  const { renderState, reloadRenderState } = useRenderStateQuery();
  const {
    alsoPublish,
    armPublishAfterRender,
    handlePublishExecute: executePublish,
    publishError,
    publishExecuteDisabled,
    publishExecuteLabel,
    publishState,
    resetPublishWatch,
    setAlsoPublish,
    watchRenderForPublish,
  } = usePublish();
  const [renderDialogOpen, setRenderDialogOpen] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [dialogJobPhase, setDialogJobPhase] = useState<DialogJobPhase>("render");

  useEffect(() => {
    watchRenderForPublish(renderState);
  }, [renderState, watchRenderForPublish]);

  useEffect(() => {
    if (renderState.status === "running") {
      setDialogJobPhase("render");
    }
  }, [renderState.status]);

  useEffect(() => {
    if (publishState.status === "running") {
      setDialogJobPhase("publish");
    }
  }, [publishState.status]);

  const startRenderJob = useCallback(async () => {
    if (!projectPath) {
      throw new Error("Project path is required");
    }

    await startRender(projectPath);
    void reloadRenderState();
  }, [projectPath, reloadRenderState]);

  const canSave = options.length > 0 && !saving && pageFields.length > 0;
  const isBusy = renderState.status === "running" || publishState.status === "running";
  const renderExecuteDisabled = !canSave || isBusy;
  const renderExecuteLabel = getRenderExecuteLabel(
    saving,
    renderState.status,
    publishState.status,
    alsoPublish,
  );

  const openRenderDialog = useCallback(() => {
    setRenderDialogOpen(true);
  }, []);

  const handleRenderExecute = useCallback(() => {
    setRenderError(null);
    setDialogJobPhase("render");
    resetPublishWatch();
    armPublishAfterRender();
    void handleSubmit(async (draftProject) => {
      try {
        if (!projectPath) {
          throw new Error("Project path is required");
        }

        await toast.promise(
          saveProject(projectPath, resolveProjectSynthesisSettings(draftProject)),
          {
            loading: "保存中...",
            success: "保存して音声を更新した。",
            error: "Save failed",
          },
        );
      } catch (error) {
        setRenderError(JSON.stringify(error));
        return;
      }

      try {
        await startRenderJob();
        toast.success("Render を開始した。");
      } catch (error) {
        setRenderError(JSON.stringify(error));
      }
    })();
  }, [armPublishAfterRender, handleSubmit, projectPath, resetPublishWatch, startRenderJob]);

  const handlePublishExecute = useCallback(() => {
    setDialogJobPhase("publish");
    executePublish();
  }, [executePublish]);

  return {
    alsoPublish,
    dialogJobPhase,
    renderState,
    publishState,
    publishError,
    publishExecuteDisabled: publishExecuteDisabled || isBusy,
    publishExecuteLabel,
    renderDialogOpen,
    renderError,
    renderExecuteDisabled,
    renderExecuteLabel,
    openRenderDialog,
    setAlsoPublish,
    setRenderDialogOpen,
    handleRenderExecute,
    handlePublishExecute,
  };
}
