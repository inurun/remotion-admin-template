import type { ReactNode } from "react";
import { AccentEditor } from "@/_shared/components/accent-editor/accent-editor";
import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/_shared/components/ui/dialog";
import { Input } from "@/_shared/components/ui/input";
import { useDictionarySelectionPopover } from "./use-dictionary-selection-popover";

export function DictionarySelectionPopover({ children }: { children: ReactNode }) {
  const state = useDictionarySelectionPopover();

  return (
    <Dialog open={Boolean(state.selection)} onOpenChange={(open) => !open && state.close()}>
      <div ref={state.containerRef} onMouseUp={state.selectText}>
        {children}
      </div>
      {state.selection && (
        <DialogContent className="w-[min(92vw,24rem)] gap-3 p-4">
          <DialogHeader>
            <DialogTitle className="truncate">Add “{state.selection.surface}”</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Reading"
            value={state.reading}
            onChange={(event) => state.updateReading(event.target.value)}
          />
          <AccentEditor moras={state.moras} value={state.accent} onChange={state.setAccent} />
          <DialogFooter>
            <Button type="button" size="xs" variant="ghost" onClick={state.close}>
              Cancel
            </Button>
            <Button
              type="button"
              size="xs"
              disabled={!state.reading.trim() || state.pending}
              onClick={state.save}
            >
              {state.pending ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
