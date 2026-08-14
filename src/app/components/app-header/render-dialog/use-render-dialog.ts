import type { PublishState } from "@/app/features/publish";
import type { RenderState } from "@/app/features/render";
import { useRender } from "@/app/features/render";

function getStatusChipClass(status: RenderState["status"] | PublishState["status"]) {
  return {
    error: "border-destructive/20 bg-destructive/10 text-destructive",
    idle: "border-border bg-secondary text-secondary-foreground",
    loading: "border-primary/20 bg-primary/10 text-primary",
    ready: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700",
    running: "border-primary/20 bg-primary/10 text-primary",
    success: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700",
  }[status];
}

function getVideoHref(renderState: RenderState) {
  if (!renderState.videoPath) {
    return undefined;
  }

  return `${renderState.videoPath}?t=${renderState.logs.length}`;
}

export function useRenderDialog() {
  const {
    alsoPublish,
    dialogJobPhase,
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
  const activeLogs = dialogJobPhase === "publish" ? publishState.logs : renderState.logs;
  const statusLabel =
    dialogJobPhase === "publish" ? `publish:${activeStatus}` : `render:${activeStatus}`;

  return {
    alsoPublish,
    handlePublishExecute,
    handleRenderExecute,
    publishExecuteDisabled,
    publishExecuteLabel,
    renderDialogOpen,
    renderExecuteDisabled,
    renderExecuteLabel,
    renderState,
    setAlsoPublish,
    setRenderDialogOpen,
    statusChipClass: getStatusChipClass(activeStatus),
    statusLabel,
    activeLogs,
    videoHref: getVideoHref(renderState),
    publishResultUrl: publishState.resultUrl,
    errorMessage:
      dialogJobPhase === "publish"
        ? (publishError ?? publishState.lastError)
        : (renderError ?? renderState.lastError),
  };
}
