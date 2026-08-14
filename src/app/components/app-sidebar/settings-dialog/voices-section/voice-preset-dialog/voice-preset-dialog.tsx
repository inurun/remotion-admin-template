import { SlidersHorizontal } from "lucide-react";
import type { VoiceOption } from "@/_schemas";
import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/_shared/components/ui/dialog";
import { SynthesisSettingsFields } from "@/app/features/settings/components/synthesis-settings-fields";

export function VoicePresetDialog({
  onChange,
  value,
  voice,
}: {
  onChange: Parameters<typeof SynthesisSettingsFields>[0]["onChange"];
  value: Parameters<typeof SynthesisSettingsFields>[0]["value"];
  voice: VoiceOption;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button type="button" size="icon-sm" variant="outline" title="Voice settings" />}
      >
        <SlidersHorizontal />
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,520px)]">
        <DialogHeader>
          <DialogTitle>Voice settings</DialogTitle>
        </DialogHeader>
        <SynthesisSettingsFields provider={voice.provider} value={value} onChange={onChange} />
      </DialogContent>
    </Dialog>
  );
}
