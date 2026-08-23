import type { SavedScheduleItem } from "@/_schemas";

export function useScheduleMonthList(items: SavedScheduleItem[]) {
  return { items, isEmpty: items.length === 0 };
}
