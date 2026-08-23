import { Plus } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogMain,
  DialogTitle,
  DialogTrigger,
} from "@/_shared/components/ui/dialog";
import { getVoiceId } from "@/app/features/settings";
import type { useVoicesSection } from "@/app/components/app-sidebar/settings-dialog/voices-section/use-voices-section";

type VoicesSectionState = ReturnType<typeof useVoicesSection>;

export function AddVoicesDialog({ voices }: { voices: VoicesSectionState }) {
  return (
    <Dialog open={voices.addDialogOpen} onOpenChange={voices.handleAddDialogOpenChange}>
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
        <Plus />
        Add
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[min(92vw,520px)]">
        <DialogHeader>
          <DialogTitle>Add voices</DialogTitle>
        </DialogHeader>
        <DialogMain>
          {voices.emptyMessage ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              {voices.emptyMessage}
            </div>
          ) : (
            <div className="grid gap-2 pr-1">
              {voices.addableVoices.map((voice) => {
                const voiceId = getVoiceId(voice);
                const checked = voices.selectedVoiceIds.includes(voiceId);

                return (
                  <label
                    key={voiceId}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        voices.toggleSelectedVoice(voiceId, event.target.checked)
                      }
                    />
                    <span className="min-w-0 truncate">{voice.displayName}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {voice.provider}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </DialogMain>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button
            type="button"
            disabled={voices.isLoadingCatalog || voices.selectedVoiceIds.length === 0}
            onClick={voices.addSelectedVoices}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
