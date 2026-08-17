import { useFormContext, useWatch } from "react-hook-form";
import { voiceProviderSchema } from "@/_schemas";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useSettings } from "@/app/features/settings";
import { getVoiceValue } from "@/app/features/editor";
import { applyTtsVoiceChange } from "@/app/features/tts";

export function useTtsVoiceField(index: number, onSelect: (index: number) => void) {
  const { control, getFieldState, formState, setValue } = useFormContext<PageFormValues>();
  const { options } = useSettings();
  const selectItems = options.map((option) => ({
    value: getVoiceValue(option),
    label: option.displayName,
  }));
  const ttsItem = useWatch({
    control,
    name: `tts.${index}`,
  });

  const fieldName = `tts.${index}.voiceName` as const;
  const fieldState = getFieldState(fieldName, formState);
  const selectedValue = getVoiceValue({
    provider: ttsItem?.provider ?? "voisona",
    voiceName: ttsItem?.voiceName ?? "",
    voiceVersion: ttsItem?.voiceVersion ?? "",
  });
  const matchedItem = selectItems.find((item) => item.value === selectedValue);

  const changeVoice = (value: string | null) => {
    if (!value || !ttsItem || !selectItems.some((item) => item.value === value)) {
      return;
    }

    const [nextProvider, nextVoiceName, nextVoiceVersion] = value.split("::");
    const parsedProvider = voiceProviderSchema.catch("voisona").parse(nextProvider);
    setValue(
      `tts.${index}`,
      applyTtsVoiceChange(ttsItem, {
        provider: parsedProvider,
        voiceName: nextVoiceName ?? "",
        voiceVersion: nextVoiceVersion ?? "",
      }),
      { shouldDirty: true },
    );
    onSelect(index);
  };

  return {
    fieldState,
    matchedItem,
    options,
    selectItems,
    selectedValue: matchedItem ? selectedValue : null,
    changeVoice,
  };
}
