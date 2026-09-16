import { useSortable } from "@dnd-kit/react/sortable";
import { useTts } from "@/app/features/tts";
import { useSelectedPage } from "@/app/features/page";
import { useSavedProject } from "@/app/features/editor/store/saved-project-store-context";

export function useTtsItem(ttsId: string, index: number) {
  const { selectedTtsId } = useTts();
  const { pageId } = useSelectedPage();
  const audio = useSavedProject((state) => {
    const item = state.itemsById[pageId];
    if (!item || item.type === "transition") {
      return undefined;
    }
    return item.tts.find((tts) => tts.id === ttsId)?.audio;
  });
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
    synthesisStatus:
      audio?.status === "analyzing" || audio?.status === "pending" || audio?.status === "failed"
        ? audio.status
        : undefined,
    synthesisError: audio?.status === "failed" ? audio.error : undefined,
  };
}
