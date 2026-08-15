import { useFormContext, useWatch } from "react-hook-form";
import { voiceProviderSchema, type DraftProject } from "@/_schemas";
import { useSelectedPage } from "@/app/features/page";
import { useSettings } from "@/app/features/settings";
import { getVoiceValue } from "@/app/features/editor";
import { applyTtsVoiceChange } from "@/app/features/tts";

export function useTtsVoiceField(index: number, onSelect: (index: number) => void) {
  const { control, getFieldState, formState, setValue } = useFormContext<DraftProject>();
  const { selectedPageIndex } = useSelectedPage();
  const { options } = useSettings();
  const selectItems = options.map((option) => ({
    value: getVoiceValue(option),
    label: option.displayName,
  }));
  const ttsItem = useWatch({
    control,
    name: `pages.${selectedPageIndex}.tts.${index}`,
  });

  const fieldName = `pages.${selectedPageIndex}.tts.${index}.voiceName` as const;
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
      `pages.${selectedPageIndex}.tts.${index}`,
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
