import { GripVertical, Trash2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { VoiceOption } from "@/_schemas";
import { Button } from "@/_shared/components/ui/button";
import { HotkeyInput } from "@/_shared/components/ui/hotkey-input";
import { Input } from "@/_shared/components/ui/input";
import type { SettingsFormValues } from "@/app/components/app-sidebar/settings-dialog/use-settings-dialog";
import type { useVoicesSection } from "@/app/components/app-sidebar/settings-dialog/voices-section/use-voices-section";
import { VoicePresetDialog } from "@/app/components/app-sidebar/settings-dialog/voices-section/voice-preset-dialog/voice-preset-dialog";
import { useVoiceRow } from "@/app/components/app-sidebar/settings-dialog/voices-section/voice-row/use-voice-row";

type VoicesSectionState = ReturnType<typeof useVoicesSection>;

export function VoiceRow({
  form,
  index,
  settingIndex,
  voice,
  voices,
}: {
  form: UseFormReturn<SettingsFormValues>;
  index: number;
  settingIndex: number;
  voice: VoiceOption;
  voices: VoicesSectionState;
}) {
  const row = useVoiceRow({ form, index, settingIndex, voice, voices });

  return (
    <div
      ref={row.ref}
      data-dragging={row.isDragging}
      className="grid gap-2 rounded-lg border border-border bg-card p-2 transition data-[dragging=true]:opacity-70"
    >
      <div className="grid grid-cols-[24px_minmax(0,1fr)_88px_110px_32px_32px] items-center gap-2">
        <span
          ref={row.handleRef}
          className="inline-flex size-6 cursor-grab items-center justify-center rounded-md text-muted-foreground active:cursor-grabbing"
          title="Reorder"
          aria-label="Reorder"
        >
          <GripVertical className="size-4" />
        </span>
        <Input
          value={row.label}
          placeholder={voice.displayName}
          onChange={(event) => row.onLabelChange(event.target.value)}
        />
        <Input
          value={row.alias}
          placeholder="alias"
          onChange={(event) => row.onAliasChange(event.target.value)}
        />
        <HotkeyInput
          value={row.hotkey}
          placeholder="ctrl+1"
          aria-invalid={Boolean(row.error)}
          onValueChange={row.onHotkeyChange}
        />
        <VoicePresetDialog
          disabled={!row.canEditPreset}
          onChange={row.onSynthesisSettingsChange}
          value={row.synthesisSettings}
          voice={voice}
        />
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          title="Remove"
          aria-label="Remove"
          onClick={row.onRemove}
        >
          <Trash2 />
        </Button>
      </div>
      <div className="grid grid-cols-[24px_minmax(0,1fr)_88px_110px_32px_32px] gap-2 text-xs text-muted-foreground">
        <span />
        <span className="truncate">{voice.displayName}</span>
        <span />
        <span className="truncate text-destructive">{row.error}</span>
        <span />
        <span />
      </div>
    </div>
  );
}
