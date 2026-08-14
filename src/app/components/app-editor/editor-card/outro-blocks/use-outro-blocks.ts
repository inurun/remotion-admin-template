import { useCallback } from "react";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { DraftProject, OutroBlock } from "@/_schemas";
import { createBlankOutroBlock } from "@/app/features/page/lib/outro-block";
import { useSelectedPage } from "@/app/features/page";

function cloneBlocks(items: OutroBlock[]) {
  return items.map((item) => ({ ...item }));
}

export function useOutroBlocks() {
  const form = useFormContext<DraftProject>();
  const { selectedPageIndex } = useSelectedPage();
  const { fields, move, replace, append } = useFieldArray({
    control: form.control,
    keyName: "fieldKey",
    name: `pages.${selectedPageIndex}.meta.blocks`,
  });

  const removeBlock = useCallback(
    (index: number) => {
      const blocksBefore = form.getValues(`pages.${selectedPageIndex}.meta.blocks`) ?? [];
      if (index < 0 || index >= blocksBefore.length) {
        return;
      }

      const blocksAfter = cloneBlocks(blocksBefore.filter((_, itemIndex) => itemIndex !== index));
      form.setValue(`pages.${selectedPageIndex}.meta.blocks`, blocksAfter, { shouldDirty: true });
      replace(blocksAfter);
    },
    [form, replace, selectedPageIndex],
  );

  const addBlock = useCallback(() => {
    append(createBlankOutroBlock());
  }, [append]);

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
    fields,
    addBlock,
    removeBlock,
    handleDragEnd,
  };
}
