import { useSortable } from "@dnd-kit/react/sortable";

export function useEndcardListItem(itemId: string, index: number) {
  const { ref, handleRef, isDragging } = useSortable({
    id: itemId,
    index,
    transition: {
      duration: 160,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
      idle: true,
    },
  });

  return {
    ref,
    handleRef,
    isDragging,
  };
}
