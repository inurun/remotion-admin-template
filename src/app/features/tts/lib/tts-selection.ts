import { moveItem } from "@/app/features/ui/lib/reorder";

export function resolveTtsIndexForPage(ttsCount: number): number | null {
  return ttsCount > 0 ? 0 : null;
}

export function resolveTtsIndexAfterRemove(
  ttsCountBeforeRemove: number,
  removedIndex: number,
): number | null {
  if (ttsCountBeforeRemove <= 1) {
    return null;
  }

  return Math.min(removedIndex, ttsCountBeforeRemove - 2);
}

export function resolveTtsIndexAfterInsert(afterIndex: number) {
  return afterIndex + 1;
}

function resolveTtsIndexAfterMove(
  ttsIds: string[],
  selectedTtsIndex: number | null,
  fromIndex: number,
  toIndex: number,
) {
  if (selectedTtsIndex === null) {
    return null;
  }

  const selectedTtsId = ttsIds[selectedTtsIndex];
  if (!selectedTtsId) {
    return null;
  }

  return moveItem(ttsIds, fromIndex, toIndex).findIndex((id) => id === selectedTtsId);
}

function isTtsIndexInRange(ttsCount: number, index: number) {
  return index >= 0 && index < ttsCount;
}

function canMoveTts(ttsCount: number, fromIndex: number, toIndex: number) {
  return (
    fromIndex !== toIndex &&
    isTtsIndexInRange(ttsCount, fromIndex) &&
    isTtsIndexInRange(ttsCount, toIndex)
  );
}

export function getTtsMoveState(
  ttsIds: string[],
  selectedTtsIndex: number | null,
  fromIndex: number,
  toIndex: number,
) {
  if (!canMoveTts(ttsIds.length, fromIndex, toIndex)) {
    return null;
  }

  return {
    fromIndex,
    toIndex,
    nextSelectedTtsIndex: resolveTtsIndexAfterMove(ttsIds, selectedTtsIndex, fromIndex, toIndex),
  };
}
