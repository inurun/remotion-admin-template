import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useCallback } from "react";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { OutroBlock } from "@/_schemas";
import { createBlankOutroBlock } from "@/app/features/page/lib/outro-block";

function cloneBlocks(items: OutroBlock[]) {
  return items.map((item) => ({ ...item }));
}

export function useOutroBlocks() {
  const form = useFormContext<PageFormValues>();
  const { fields, move, replace, append } = useFieldArray({
    control: form.control,
    keyName: "fieldKey",
    name: `meta.blocks`,
  });

  const removeBlock = useCallback(
    (index: number) => {
      const blocksBefore = form.getValues(`meta.blocks`) ?? [];
      if (index < 0 || index >= blocksBefore.length) {
        return;
      }

      const blocksAfter = cloneBlocks(blocksBefore.filter((_, itemIndex) => itemIndex !== index));
      form.setValue(`meta.blocks`, blocksAfter, { shouldDirty: true });
      replace(blocksAfter);
    },
    [form, replace],
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
