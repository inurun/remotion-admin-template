import type { ScheduleDateGroup, ScheduleFormValues } from "@/app/features/schedule";
import { formatScheduleDateLabel } from "@/app/features/schedule";
import { ScheduleMonthListItem } from "@/app/components/app-schedule/schedule-month-list/schedule-month-list-item/schedule-month-list-item";
import { useScheduleMonthList } from "@/app/components/app-schedule/schedule-month-list/use-schedule-month-list";

export function ScheduleMonthList({
  groups,
  pending,
  onUpsert,
  onRemove,
}: {
  groups: ScheduleDateGroup[];
  pending: boolean;
  onUpsert: (values: ScheduleFormValues) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const list = useScheduleMonthList(groups);

  if (list.isEmpty) {
    return <p className="text-sm text-muted-foreground">No schedules this month.</p>;
  }

  return (
    <div className="grid gap-4">
      {list.groups.map((group) => (
        <section key={group.date} className="grid gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            {formatScheduleDateLabel(group.date)}
          </h3>
          <div className="grid gap-2">
            {group.items.map((item) => (
              <ScheduleMonthListItem
                key={item.id}
                item={item}
                pending={pending}
                onUpsert={onUpsert}
                onRemove={onRemove}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
