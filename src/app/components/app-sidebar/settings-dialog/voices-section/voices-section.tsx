import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import type { UseFormReturn } from "react-hook-form";
import { getVoiceId } from "@/app/features/settings";
import type { SettingsFormValues } from "@/app/components/app-sidebar/settings-dialog/use-settings-dialog";
import { AddVoicesDialog } from "@/app/components/app-sidebar/settings-dialog/voices-section/add-voices-dialog/add-voices-dialog";
import { useVoicesSection } from "@/app/components/app-sidebar/settings-dialog/voices-section/use-voices-section";
import { VoiceRow } from "@/app/components/app-sidebar/settings-dialog/voices-section/voice-row/voice-row";

export function VoicesSection({
  form,
  settingsOpen,
}: {
  form: UseFormReturn<SettingsFormValues>;
  settingsOpen: boolean;
}) {
  const voices = useVoicesSection(form, settingsOpen);

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.canceled) {
      return;
    }

    const { source } = event.operation;
    if (!isSortable(source)) {
      return;
    }

    voices.moveVoice(source.initialIndex, source.index);
  };

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Voices</h3>
        <AddVoicesDialog voices={voices} />
      </div>
      {voices.visibleVoices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          No voices.
        </div>
      ) : (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div className="grid max-h-[36vh] gap-2 overflow-y-auto pr-1">
            {voices.visibleVoices.map((voice, index) => {
              const settingIndex = voices.getVoiceSettingIndexFor(voice);
              if (settingIndex === -1) {
                return null;
              }

              return (
                <VoiceRow
                  key={getVoiceId(voice)}
                  form={form}
                  index={index}
                  settingIndex={settingIndex}
                  voice={voice}
                  voices={voices}
                />
              );
            })}
          </div>
        </DragDropProvider>
      )}
    </section>
  );
}
