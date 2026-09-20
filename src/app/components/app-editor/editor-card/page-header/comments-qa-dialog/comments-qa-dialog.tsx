import { FormProvider } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogMain,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { TtsList } from "@/app/components/app-editor/editor-card/tts-list/tts-list";
import { SelectedTtsProvider } from "@/app/features/tts/context/selected-tts-state";
import { TtsContextProvider } from "@/app/features/tts/context/tts-context";
import { TtsTextFocusContextProvider } from "@/app/features/tts/context/tts-text-focus-context";
import { useCommentsQaDialog } from "./use-comments-qa-dialog";

export function CommentsQaDialog({ disabled }: { disabled: boolean }) {
  const dialog = useCommentsQaDialog();

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.handleOpenChange}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }
          dialog.handleOpenChange(true, { reason: "none", cancel: () => undefined } as never);
        }}
      >
        Q&A
      </Button>
      <DialogContent
        showCloseButton={!dialog.saving}
        className="flex h-[min(92vh,720px)] w-[min(96vw,720px)] max-w-none flex-col gap-3 overflow-hidden p-4"
      >
        <DialogHeader>
          <DialogTitle>Q&A</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {dialog.position.current}/{dialog.position.total}
          </p>
        </DialogHeader>
        {dialog.status ? <p className="text-sm text-destructive">{dialog.status}</p> : null}
        <DialogMain className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap gap-2 pb-5">
            {dialog.comments.map((comment) => (
              <div key={comment.id}>{comment.body}</div>
            ))}
          </div>
          <FormProvider {...dialog.draftForm}>
            <SelectedTtsProvider pageId={dialog.qaSelectionKey}>
              <TtsContextProvider>
                <TtsTextFocusContextProvider pageId={dialog.qaSelectionKey}>
                  <div
                    className={
                      dialog.saving
                        ? "pointer-events-none min-h-0 flex-1 opacity-60"
                        : "min-h-0 flex-1"
                    }
                  >
                    {dialog.open && dialog.currentGroupId ? (
                      <TtsList key={dialog.currentGroupId} />
                    ) : null}
                  </div>
                </TtsTextFocusContextProvider>
              </TtsContextProvider>
            </SelectedTtsProvider>
          </FormProvider>
        </DialogMain>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={dialog.saving} onClick={dialog.close}>
            Close
          </Button>
          <Button type="button" variant="outline" disabled={!dialog.canBack} onClick={dialog.back}>
            Back
          </Button>
          <Button type="button" variant="outline" disabled={!dialog.canNext} onClick={dialog.next}>
            Next
          </Button>
          <Button
            type="button"
            disabled={dialog.saving || !dialog.canDone}
            onMouseDown={(event) => event.preventDefault()}
            onClick={dialog.done}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
