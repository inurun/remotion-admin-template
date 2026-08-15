import { useFormContext, useWatch } from "react-hook-form";
import type { DraftProject } from "@/_schemas";
import { useSelectedPage } from "@/app/features/page";
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
  const { control, getFieldState, formState, setValue } = useFormContext<DraftProject>();
  const { selectedPageIndex } = useSelectedPage();
  const textAreaRef = useTtsTextFocusRef(ttsId);
  const handleKeyDown = useTtsTextFieldKeyDown({
    pageIndex: selectedPageIndex,
    ttsIndex: index,
    onInsertAfter,
    onRemove,
  });
  const ttsItem = useWatch({
    control,
    name: `pages.${selectedPageIndex}.tts.${index}`,
  });

  const fieldName = `pages.${selectedPageIndex}.tts.${index}.text` as const;
  const fieldState = getFieldState(fieldName, formState);

  const changeText = (nextText: string) => {
    if (!ttsItem) {
      return;
    }

    setValue(`pages.${selectedPageIndex}.tts.${index}`, applyTtsTextChange(ttsItem, nextText), {
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
