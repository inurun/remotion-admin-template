import { SlidersHorizontal } from "lucide-react";
import type { VoiceOption } from "@/_schemas";
import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogMain,
  DialogTitle,
  DialogTrigger,
} from "@/_shared/components/ui/dialog";
import { SynthesisSettingsFields } from "@/app/features/settings/components/synthesis-settings-fields";

export function VoicePresetDialog({
  disabled,
  onChange,
  value,
  voice,
}: {
  disabled?: boolean;
  onChange: Parameters<typeof SynthesisSettingsFields>[0]["onChange"];
  value: Parameters<typeof SynthesisSettingsFields>[0]["value"];
  voice: VoiceOption;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            title="Voice settings"
            disabled={disabled}
          />
        }
      >
        <SlidersHorizontal />
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[min(92vw,520px)]">
        <DialogHeader>
          <DialogTitle>Voice settings</DialogTitle>
        </DialogHeader>
        <DialogMain>
          <SynthesisSettingsFields provider={voice.provider} value={value} onChange={onChange} />
        </DialogMain>
      </DialogContent>
    </Dialog>
  );
}
