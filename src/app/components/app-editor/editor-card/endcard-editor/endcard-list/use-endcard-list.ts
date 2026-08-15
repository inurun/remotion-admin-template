import { useCallback } from "react";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { DraftProject, EndcardAdvertiser, EndcardCredit, EndcardMessage } from "@/_schemas";
import { useSelectedPage } from "@/app/features/page";

function cloneItems<T extends object>(items: T[]) {
  return items.map((item) => ({ ...item }));
}

function useEndcardFieldArray<T extends { id: string }>(
  name: "credits" | "advertisers" | "messages",
  createBlank: () => T,
) {
  const form = useFormContext<DraftProject>();
  const { selectedPageIndex } = useSelectedPage();
  const fieldName = `pages.${selectedPageIndex}.meta.${name}` as never;
  const { fields, move, replace, append } = useFieldArray({
    control: form.control,
    keyName: "fieldKey",
    name: fieldName,
  });

  const removeItem = useCallback(
    (index: number) => {
      const itemsBefore = (form.getValues(fieldName) as unknown as T[] | undefined) ?? [];
      if (index < 0 || index >= itemsBefore.length) {
        return;
      }

      const itemsAfter = cloneItems(itemsBefore.filter((_, itemIndex) => itemIndex !== index));
      form.setValue(fieldName, itemsAfter as never, { shouldDirty: true });
      replace(itemsAfter as never);
    },
    [fieldName, form, replace],
  );

  const addItem = useCallback(() => {
    append(createBlank() as never);
  }, [append, createBlank]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (event.canceled) {
        return;
      }

      const { source } = event.operation;
      if (!isSortable(source)) {
        return;
      }

      if (source.initialIndex === source.index) {
        return;
      }

      move(source.initialIndex, source.index);
    },
    [move],
  );

  return {
    fields: fields as Array<{ fieldKey: string; id: string }>,
    addItem,
    removeItem,
    replace: (items: T[]) => replace(items as never),
    handleDragEnd,
  };
}

export function useEndcardCredits(createBlank: () => EndcardCredit) {
  return useEndcardFieldArray("credits", createBlank);
}

export function useEndcardAdvertisers(createBlank: () => EndcardAdvertiser) {
  return useEndcardFieldArray("advertisers", createBlank);
}

export function useEndcardMessages(createBlank: () => EndcardMessage) {
  return useEndcardFieldArray("messages", createBlank);
}
