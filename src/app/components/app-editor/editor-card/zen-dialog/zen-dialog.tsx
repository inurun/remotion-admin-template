import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/_shared/components/ui/dialog";
import { useZenDialog } from "@/app/components/app-editor/editor-card/zen-dialog/use-zen-dialog";
import { ZenEditor } from "@/app/components/app-editor/editor-card/zen-dialog/zen-editor/zen-editor";

export function ZenDialog() {
  const dialog = useZenDialog();

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.handleOpenChange}>
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
        Zen
      </DialogTrigger>
      <DialogContent
        showCloseButton
        className="flex h-[min(96vh,920px)] w-[min(96vw,1100px)] max-w-none flex-col gap-3 overflow-hidden p-4"
      >
        <DialogHeader>
          <DialogTitle>Zen</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          <ZenEditor
            aliases={dialog.completionAliases}
            value={dialog.source}
            onChange={dialog.setSource}
          />
        </div>

        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">
            {dialog.pageCount} pages / {dialog.ttsCount} tts
          </p>
          {dialog.errors.length > 0 ? (
            <ul className="max-h-24 space-y-0.5 overflow-auto text-destructive">
              {dialog.errors.map((error) => (
                <li key={`${error.line}:${error.message}`}>
                  {error.line > 0 ? `L${error.line}: ` : ""}
                  {error.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={dialog.close}>
            Close
          </Button>
          <Button
            type="button"
            disabled={!dialog.canInsert}
            onClick={() => {
              void dialog.insert();
            }}
          >
            {dialog.isInserting ? "Inserting..." : "Insert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
