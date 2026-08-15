import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/_shared/components/ui/dialog";
import { SynthesisSettingsFields } from "@/app/features/settings/components/synthesis-settings-fields";
import { useTtsSettingsDialog } from "@/app/components/app-editor/config-card/tts-settings-dialog/use-tts-settings-dialog";

export function TtsSettingsDialog() {
  const dialog = useTtsSettingsDialog();

  if (!dialog.item) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<Button type="button" size="icon" variant="outline" title="Voice settings" />}
      >
        <SlidersHorizontal />
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,520px)]">
        <DialogHeader>
          <DialogTitle>Voice settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Button type="button" variant="secondary" onClick={dialog.loadPreset}>
            Load preset
          </Button>
          <SynthesisSettingsFields
            provider={dialog.item.provider}
            value={dialog.displayedSynthesisSettings}
            onChange={dialog.setSynthesisSettings}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
