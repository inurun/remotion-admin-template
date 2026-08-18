import { PocketKnife } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/_shared/components/ui/dialog";
import { ZenEditor } from "@/app/features/zen/components/zen-editor/zen-editor";
import { useZenDialog } from "@/app/components/app-editor/editor-card/zen-dialog/use-zen-dialog";

export function ZenDialog() {
  const dialog = useZenDialog();
  const globalErrors = dialog.errors.filter((error) => error.line === 0);

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.handleOpenChange}>
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
        <PocketKnife className="size-4 rotate-90 -scale-x-100" />
      </DialogTrigger>
      <DialogContent
        showCloseButton
        className="flex h-[min(96vh,920px)] w-[min(96vw,1100px)] max-w-none flex-col gap-3 overflow-hidden p-4"
      >
        <DialogHeader>
          <DialogTitle>
            <PocketKnife className="size-4 rotate-90 -scale-x-100" />
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          {dialog.open ? (
            <ZenEditor
              aliases={dialog.completionAliases}
              lintAliases={dialog.aliases}
              value={dialog.source}
              onChange={dialog.setSource}
            />
          ) : null}
        </div>

        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">
            {dialog.pageCount} pages / {dialog.ttsCount} tts
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
          <Button type="button" variant="outline" onClick={dialog.close}>
            Close
          </Button>
          <Button type="button" disabled={!dialog.canInsert} onClick={dialog.insert}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
