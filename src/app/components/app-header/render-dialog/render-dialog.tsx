import { Clapperboard, Upload } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/_shared/components/ui/dialog";
import { cn } from "@/_shared/lib/utils";
import { JobLogPanel } from "@/app/components/app-header/job-log-panel/job-log-panel";
import { RenderVideoLink } from "@/app/components/app-header/render-dialog/render-video-link/render-video-link";
import { useRenderDialog } from "@/app/components/app-header/render-dialog/use-render-dialog";

export function RenderDialog() {
  const dialog = useRenderDialog();

  return (
    <Dialog open={dialog.renderDialogOpen} onOpenChange={dialog.setRenderDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-10">
            <DialogTitle>Render</DialogTitle>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                dialog.statusChipClass,
              )}
            >
              {dialog.statusLabel}
            </span>
          </div>
          <DialogDescription>
            保存済み内容から書き出す。既存 mp4 があれば Publish のみも可。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dialog.alsoPublish}
              disabled={dialog.renderExecuteDisabled}
              onChange={(event) => dialog.setAlsoPublish(event.target.checked)}
            />
            Also publish after render
          </label>
          <RenderVideoLink videoHref={dialog.videoHref} />
          {dialog.publishResultUrl && (
            <a
              className="truncate text-sm text-primary underline"
              href={dialog.publishResultUrl}
              rel="noreferrer"
              target="_blank"
            >
              {dialog.publishResultUrl}
            </a>
          )}
          <JobLogPanel logs={dialog.activeLogs} />
          {dialog.errorMessage && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {dialog.errorMessage}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>閉じる</DialogClose>
          <Button
            type="button"
            variant="secondary"
            disabled={dialog.publishExecuteDisabled}
            onClick={dialog.handlePublishExecute}
          >
            <Upload />
            {dialog.publishExecuteLabel}
          </Button>
          <Button
            type="button"
            disabled={dialog.renderExecuteDisabled}
            onClick={dialog.handleRenderExecute}
          >
            <Clapperboard />
            {dialog.renderExecuteLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
