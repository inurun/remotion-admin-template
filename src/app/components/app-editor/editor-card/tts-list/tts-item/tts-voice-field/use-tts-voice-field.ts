import { useFormContext, useWatch } from "react-hook-form";
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

  const fieldName = `tts.${index}.provider` as const;
  const fieldState = getFieldState(fieldName, formState);
  const selectedValue = ttsItem ? getVoiceValue(ttsItem) : "";
  const matchedItem = selectItems.find((item) => item.value === selectedValue);

  const changeVoice = (value: string | null) => {
    if (!value || !ttsItem) {
      return;
    }

    const option = options.find((item) => getVoiceValue(item) === value);
    if (!option) {
      return;
    }

    setValue(`tts.${index}`, applyTtsVoiceChange(ttsItem, option), { shouldDirty: true });
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
