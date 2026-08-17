import { useFormContext, useWatch } from "react-hook-form";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { applyTtsTextChange, useTtsTextFocusRef } from "@/app/features/tts";
import { useTtsTextFieldKeyDown } from "@/app/components/app-editor/editor-card/tts-list/tts-item/tts-text-field/tts-text-field.hotkeys";

export function useTtsTextField({
  index,
  ttsId,
  onFocus,
  onInsertAfter,
  onRemove,
}: {
  index: number;
  ttsId: string;
  onFocus: (index: number) => void;
  onInsertAfter: (index: number) => void;
  onRemove: () => void;
}) {
  const { control, getFieldState, formState, setValue } = useFormContext<PageFormValues>();
  const textAreaRef = useTtsTextFocusRef(ttsId);
  const handleKeyDown = useTtsTextFieldKeyDown({
    ttsId,
    ttsIndex: index,
    onInsertAfter,
    onRemove,
  });
  const ttsItem = useWatch({
    control,
    name: `tts.${index}`,
  });

  const fieldName = `tts.${index}.text` as const;
  const fieldState = getFieldState(fieldName, formState);

  const changeText = (nextText: string) => {
    if (!ttsItem) {
      return;
    }

    setValue(`tts.${index}`, applyTtsTextChange(ttsItem, nextText), {
      shouldDirty: true,
    });
  };

  return {
    fieldName,
    fieldState,
    text: ttsItem?.text ?? "",
    textAreaRef,
    handleKeyDown,
    changeText,
    focusField: () => onFocus(index),
  };
}
