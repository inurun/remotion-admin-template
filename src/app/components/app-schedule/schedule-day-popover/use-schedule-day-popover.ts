import { useState } from "react";
import type { SavedScheduleItem } from "@/_schemas";

export function useScheduleDayPopover(items: SavedScheduleItem[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  return {
    selectedItem,
    selectItem: setSelectedId,
    startCreate: () => {
      setSelectedId(null);
    },
  };
}
