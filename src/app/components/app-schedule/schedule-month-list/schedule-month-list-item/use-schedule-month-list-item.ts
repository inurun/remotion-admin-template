import type { SavedScheduleItem } from "@/_schemas";
import type { ScheduleFormValues } from "@/app/features/schedule";

export function useScheduleMonthListItem({
  item,
  pending,
  onUpsert,
  onRemove,
}: {
  item: SavedScheduleItem;
  pending: boolean;
  onUpsert: (values: ScheduleFormValues) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  return {
    item,
    pending,
    onUpsert,
    onRemove,
    onDelete: () => onRemove(item.id),
  };
}
