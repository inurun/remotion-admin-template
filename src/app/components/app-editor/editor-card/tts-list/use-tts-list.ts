import { useCallback } from "react";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { DraftProject, DraftTts } from "@/_schemas";
import { useSelectedPage } from "@/app/features/page";
import { useSettings } from "@/app/features/settings";
import {
  createDraftTts,
  getTtsMoveState,
  resolveTtsIndexAfterInsert,
  resolveTtsIndexAfterRemove,
  useTts,
  useTtsTextFocus,
} from "@/app/features/tts";

function cloneTtsItem(item: DraftTts): DraftTts {
  return {
    ...item,
    speech: { ...item.speech },
  };
}

export function useTtsList() {
  const form = useFormContext<DraftProject>();
  const { selectedPageIndex } = useSelectedPage();
  const { selectedTtsIndex, selectTts, clearSelection } = useTts();
  const { options } = useSettings();
  const { requestTextFocus } = useTtsTextFocus();
  const { fields, move, insert, remove, append } = useFieldArray({
    control: form.control,
    keyName: "fieldKey",
    name: `pages.${selectedPageIndex}.tts`,
  });

  const removeTts = useCallback(
    (index: number) => {
      const ttsBefore = form.getValues(`pages.${selectedPageIndex}.tts`) ?? [];
      if (index < 0 || index >= ttsBefore.length) {
        return;
      }

      const nextTtsIndex = resolveTtsIndexAfterRemove(ttsBefore.length, index);
      const ttsAfter = ttsBefore.filter((_, itemIndex) => itemIndex !== index).map(cloneTtsItem);

      if (nextTtsIndex === null) {
        clearSelection();
      } else {
        const nextTts = ttsAfter[nextTtsIndex];
        selectTts(nextTtsIndex);
        if (nextTts) {
          requestTextFocus(nextTts.id);
        }
      }

      remove(index);
    },
    [clearSelection, form, remove, requestTextFocus, selectTts, selectedPageIndex],
  );

  const insertTtsAfter = useCallback(
    (index: number) => {
      const ttsBefore = form.getValues(`pages.${selectedPageIndex}.tts`) ?? [];
      if (index < 0 || index >= ttsBefore.length) {
        return;
      }

      const nextTtsIndex = resolveTtsIndexAfterInsert(index);
      const nextTts = createDraftTts(options, ttsBefore[index]);

      insert(nextTtsIndex, nextTts);
      selectTts(nextTtsIndex);
      requestTextFocus(nextTts.id);
    },
    [form, insert, options, requestTextFocus, selectTts, selectedPageIndex],
  );

  const appendTts = useCallback(() => {
    const ttsBefore = form.getValues(`pages.${selectedPageIndex}.tts`) ?? [];
    const sourceTts = selectedTtsIndex !== null ? ttsBefore[selectedTtsIndex] : ttsBefore.at(-1);
    const nextTts = createDraftTts(options, sourceTts);
    const nextTtsIndex = ttsBefore.length;
    append(nextTts);
    selectTts(nextTtsIndex);
    requestTextFocus(nextTts.id);
  }, [append, form, options, requestTextFocus, selectTts, selectedPageIndex, selectedTtsIndex]);

  const moveTts = useCallback(
    (fromIndex: number, toIndex: number) => {
      const ttsMove = getTtsMoveState(
        fields.map((field) => field.id),
        selectedTtsIndex,
        fromIndex,
        toIndex,
      );

      if (!ttsMove) {
        return;
      }

      move(ttsMove.fromIndex, ttsMove.toIndex);
      if (ttsMove.nextSelectedTtsIndex !== null) {
        selectTts(ttsMove.nextSelectedTtsIndex);
      }
    },
    [fields, move, selectTts, selectedTtsIndex],
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
      selectTts(index);
    },
    [selectTts],
  );

  return {
    selectedTtsIndex,
    fields,
    removeTts,
    insertTtsAfter,
    appendTts,
    handleDragEnd,
    selectTtsOnFocus,
    selectTts,
  };
}
