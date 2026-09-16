import { PocketKnife } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { ZenEditor } from "@/app/features/zen/components/zen-editor/zen-editor";
import { useCommentsZenDialog } from "./use-comments-zen-dialog";
import { CommentsZenProvider } from "./comments-zen-context";
import type { ReactNode } from "react";

export function CommentsZenRoot({ children }: { children: ReactNode }) {
  const dialog = useCommentsZenDialog();
  const globalErrors = dialog.errors.filter((error) => error.line === 0);

  return (
    <CommentsZenProvider value={{ openZen: dialog.openZen }}>
      {children}
      <Dialog open={dialog.open} onOpenChange={dialog.handleOpenChange}>
        <DialogContent
          showCloseButton
          className="flex h-[min(96vh,920px)] w-[min(96vw,1100px)] max-w-none flex-col gap-3 overflow-hidden p-4"
        >
          <DialogHeader>
            <DialogTitle>
              <PocketKnife className="size-4 rotate-90 -scale-x-100" />
            </DialogTitle>
          </DialogHeader>
          {dialog.status ? <p className="text-sm text-muted-foreground">{dialog.status}</p> : null}
          {!dialog.localSaveOk ? (
            <p className="text-sm text-destructive">Draft not saved locally</p>
          ) : null}
          {dialog.conflict !== "none" ? (
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={dialog.restoreDraft}>
                Restore draft
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={dialog.useSavedPage}>
                Use saved page
              </Button>
            </div>
          ) : null}
          <div className="min-h-0 flex-1">
            {dialog.open ? (
              <ZenEditor
                aliases={dialog.completionAliases}
                lintAliases={dialog.aliases}
                value={dialog.source}
                onChange={dialog.setSource}
                parseLint={dialog.parseLint}
                comments={dialog.insertedComments}
              />
            ) : null}
          </div>
          <div className="grid gap-1 text-sm">
            <p className="text-muted-foreground">
              {dialog.groupCount} groups / {dialog.replyCount} replies
            </p>
            {globalErrors.length > 0 ? (
              <ul className="max-h-24 space-y-0.5 overflow-auto text-destructive">
                {globalErrors.map((error) => (
                  <li key={`${error.line}:${error.message}`}>{error.message}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={dialog.discard}>
              Discard draft
            </Button>
            <Button type="button" variant="outline" onClick={dialog.close}>
              Close
            </Button>
            <Button type="button" disabled={!dialog.canApply} onClick={dialog.apply}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CommentsZenProvider>
  );
}
