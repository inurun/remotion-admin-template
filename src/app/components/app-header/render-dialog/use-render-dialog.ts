import { getProjectOutputVideoFileName } from "@/_shared/project/project-path";
import { useProject } from "@/app/features/project";
import { useRender } from "@/app/features/render";
import {
  getJobStatusLabel,
  getStatusChipClass,
  getVideoHref,
} from "@/app/components/app-header/render-dialog/use-render-dialog.lib";

function getVideoFileName(projectPath: string | null) {
  return projectPath ? getProjectOutputVideoFileName(projectPath) : "latest.mp4";
}

export function useRenderDialog() {
  const { projectPath } = useProject();
  const {
    alsoPublish,
    cancelDisabled,
    dialogJobPhase,
    handleCancel,
    handlePublishExecute,
    handleRenderExecute,
    publishError,
    publishExecuteDisabled,
    publishExecuteLabel,
    publishState,
    renderDialogOpen,
    renderError,
    renderExecuteDisabled,
    renderExecuteLabel,
    renderState,
    setAlsoPublish,
    setRenderDialogOpen,
  } = useRender();

  const activeStatus = dialogJobPhase === "publish" ? publishState.status : renderState.status;

  return {
    alsoPublish,
    cancelDisabled,
    dialogJobPhase,
    handleCancel,
    handlePublishExecute,
    handleRenderExecute,
    publishExecuteDisabled,
    publishExecuteLabel,
    publishLogs: publishState.logs,
    renderDialogOpen,
    renderExecuteDisabled,
    renderExecuteLabel,
    renderState,
    setAlsoPublish,
    setRenderDialogOpen,
    statusChipClass: getStatusChipClass(activeStatus),
    statusLabel: getJobStatusLabel(dialogJobPhase, activeStatus),
    videoHref: getVideoHref(renderState),
    videoFileName: getVideoFileName(projectPath),
    publishResultUrl: publishState.resultUrl,
    errorMessage:
      dialogJobPhase === "publish"
        ? (publishError ?? publishState.lastError)
        : (renderError ?? renderState.lastError),
  };
}
