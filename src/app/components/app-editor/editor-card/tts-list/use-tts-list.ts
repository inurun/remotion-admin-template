import { useCallback } from "react";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { useSettings } from "@/app/features/settings";
import {
  createTtsInput,
  getTtsMoveState,
  resolveTtsIndexAfterInsert,
  resolveTtsIndexAfterRemove,
  useTts,
  useTtsTextFocus,
} from "@/app/features/tts";

function cloneTtsItem(item: TtsFormValues): TtsFormValues {
  return {
    ...item,
    speech: { ...item.speech },
  };
}

export function useTtsList() {
  const form = useFormContext<PageFormValues>();
  const { selectedTtsId, selectTts, clearSelection } = useTts();
  const { options } = useSettings();
  const { requestTextFocus } = useTtsTextFocus();
  const { fields, move, insert, remove, append } = useFieldArray({
    control: form.control,
    keyName: "fieldKey",
    name: "tts",
  });
  const selectedTtsIndex = fields.findIndex((field) => field.id === selectedTtsId);

  const removeTts = useCallback(
    (index: number) => {
      const ttsBefore = form.getValues("tts") ?? [];
      if (index < 0 || index >= ttsBefore.length) {
        return;
      }

      const nextTtsIndex = resolveTtsIndexAfterRemove(ttsBefore.length, index);
      const ttsAfter = ttsBefore.filter((_, itemIndex) => itemIndex !== index).map(cloneTtsItem);

      if (nextTtsIndex === null) {
        clearSelection();
      } else {
        const nextTts = ttsAfter[nextTtsIndex];
        if (nextTts) {
          selectTts(nextTts.id);
          requestTextFocus(nextTts.id);
        }
      }

      remove(index);
    },
    [clearSelection, form, remove, requestTextFocus, selectTts],
  );

  const insertTtsAfter = useCallback(
    (index: number) => {
      const ttsBefore = form.getValues("tts") ?? [];
      if (index < 0 || index >= ttsBefore.length) {
        return;
      }

      const nextTtsIndex = resolveTtsIndexAfterInsert(index);
      const nextTts = createTtsInput(options, ttsBefore[index]);
      insert(nextTtsIndex, nextTts);
      selectTts(nextTts.id);
      requestTextFocus(nextTts.id);
    },
    [form, insert, options, requestTextFocus, selectTts],
  );

  const appendTts = useCallback(() => {
    const ttsBefore = form.getValues("tts") ?? [];
    const sourceTts = selectedTtsIndex >= 0 ? ttsBefore[selectedTtsIndex] : ttsBefore.at(-1);
    const nextTts = createTtsInput(options, sourceTts);
    append(nextTts);
    selectTts(nextTts.id);
    requestTextFocus(nextTts.id);
  }, [append, form, options, requestTextFocus, selectTts, selectedTtsIndex]);

  const moveTts = useCallback(
    (fromIndex: number, toIndex: number) => {
      const ttsMove = getTtsMoveState(
        fields.map((field) => field.id),
        selectedTtsIndex >= 0 ? selectedTtsIndex : null,
        fromIndex,
        toIndex,
      );
      if (!ttsMove) {
        return;
      }

      move(ttsMove.fromIndex, ttsMove.toIndex);
    },
    [fields, move, selectedTtsIndex],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (event.canceled) {
        return;
      }
      const { source } = event.operation;
      if (!isSortable(source)) {
        return;
      }
      moveTts(source.initialIndex, source.index);
    },
    [moveTts],
  );

  const selectTtsOnFocus = useCallback(
    (index: number) => {
      const field = fields[index];
      if (field) {
        selectTts(field.id);
      }
    },
    [fields, selectTts],
  );

  return {
    selectedTtsIndex: selectedTtsIndex >= 0 ? selectedTtsIndex : null,
    fields,
    removeTts,
    insertTtsAfter,
    appendTts,
    handleDragEnd,
    selectTtsOnFocus,
    selectTts: (index: number) => {
      const field = fields[index];
      if (field) {
        selectTts(field.id);
      }
    },
  };
}
