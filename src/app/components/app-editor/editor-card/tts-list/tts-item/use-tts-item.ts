import { useSortable } from "@dnd-kit/react/sortable";
import { useTts } from "@/app/features/tts";

export function useTtsItem(ttsId: string, index: number) {
  const { selectedTtsId } = useTts();
  const { ref, handleRef, isDragging } = useSortable({
    id: ttsId,
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
    isSelected: selectedTtsId === ttsId,
  };
}
