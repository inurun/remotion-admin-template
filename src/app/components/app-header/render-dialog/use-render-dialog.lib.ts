import type { PublishState } from "@/app/features/publish";
import type { RenderState } from "@/app/features/render";
import type { DialogJobPhase } from "@/app/features/render/context/use-render-context";

export function getStatusChipClass(status: RenderState["status"] | PublishState["status"]) {
  return {
    canceled: "border-border bg-secondary text-secondary-foreground",
    error: "border-destructive/20 bg-destructive/10 text-destructive",
    idle: "border-border bg-secondary text-secondary-foreground",
    loading: "border-primary/20 bg-primary/10 text-primary",
    ready: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700",
    running: "border-primary/20 bg-primary/10 text-primary",
    success: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700",
  }[status];
}

export function getVideoHref(renderState: Pick<RenderState, "updatedAt" | "videoPath">) {
  if (!renderState.videoPath) {
    return undefined;
  }

  return `${renderState.videoPath}?t=${renderState.updatedAt ?? 0}`;
}

export function getJobStatusLabel(
  phase: DialogJobPhase,
  status: RenderState["status"] | PublishState["status"],
) {
  return `${phase}:${status}`;
}
