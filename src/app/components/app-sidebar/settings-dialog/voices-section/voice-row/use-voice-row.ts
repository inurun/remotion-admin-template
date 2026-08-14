import { useSortable } from "@dnd-kit/react/sortable";
import type { UseFormReturn } from "react-hook-form";
import { useFormState, useWatch } from "react-hook-form";
import type { VoiceOption } from "@/_schemas";
import { getVoiceId } from "@/app/features/settings";
import { SynthesisSettingsFields } from "@/app/features/settings/components/synthesis-settings-fields";
import type { SettingsFormValues } from "@/app/components/app-sidebar/settings-dialog/use-settings-dialog";
import type { useVoicesSection } from "@/app/components/app-sidebar/settings-dialog/voices-section/use-voices-section";

type VoicesSectionState = ReturnType<typeof useVoicesSection>;

export function useVoiceRow({
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
  const label =
    useWatch({
      control: form.control,
      name: `voiceSettings.${settingIndex}.label`,
      defaultValue: "",
    }) ?? "";
  const alias =
    useWatch({
      control: form.control,
      name: `voiceSettings.${settingIndex}.alias`,
      defaultValue: "",
    }) ?? "";
  const hotkey =
    useWatch({
      control: form.control,
      name: `voiceSettings.${settingIndex}.hotkey`,
      defaultValue: "",
    }) ?? "";
  const synthesisSettings = useWatch({
    control: form.control,
    name: `voiceSettings.${settingIndex}.synthesisSettings`,
  });
  useFormState({
    control: form.control,
    name: `voiceSettings.${settingIndex}.hotkey`,
  });
  const error = form.getFieldState(`voiceSettings.${settingIndex}.hotkey`, form.formState).error
    ?.message;

  const voiceId = getVoiceId(voice);
  const { ref, handleRef, isDragging } = useSortable({
    id: voiceId,
    index,
    transition: {
      duration: 160,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
      idle: true,
    },
  });

  return {
    alias,
    error,
    handleRef,
    hotkey,
    isDragging,
    label,
    ref,
    synthesisSettings,
    voice,
    onAliasChange: (value: string) => voices.setVoiceAlias(voice, value),
    onHotkeyChange: (value: string) => voices.setVoiceHotkey(voice, value),
    onLabelChange: (value: string) => voices.setVoiceLabel(voice, value),
    onRemove: () => voices.removeVoice(voice),
    onSynthesisSettingsChange: ((value) =>
      voices.setVoiceSynthesisSettings(voice, value)) as Parameters<
      typeof SynthesisSettingsFields
    >[0]["onChange"],
  };
}
