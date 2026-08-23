import type { SavedScheduleItem } from "@/_schemas";
import type { ScheduleFormValues } from "@/app/features/schedule";
import { ScheduleMonthListItem } from "@/app/components/app-schedule/schedule-month-list/schedule-month-list-item/schedule-month-list-item";
import { useScheduleMonthList } from "@/app/components/app-schedule/schedule-month-list/use-schedule-month-list";

export function ScheduleMonthList({
  items,
  pending,
  onUpsert,
  onRemove,
}: {
  items: SavedScheduleItem[];
  pending: boolean;
  onUpsert: (values: ScheduleFormValues) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const list = useScheduleMonthList(items);

  if (list.isEmpty) {
    return <p className="text-sm text-muted-foreground">No schedules this month.</p>;
  }

  return (
    <div className="grid gap-2">
      {list.items.map((item) => (
        <ScheduleMonthListItem
          key={item.id}
          item={item}
          pending={pending}
          onUpsert={onUpsert}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
