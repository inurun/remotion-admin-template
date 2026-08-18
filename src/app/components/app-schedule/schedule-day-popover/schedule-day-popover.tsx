import type { SavedScheduleItem } from "@/_schemas";
import { Button } from "@/_shared/components/ui/button";
import { PopoverHeader, PopoverTitle } from "@/_shared/components/ui/popover";
import { formatScheduleDateLabel, type ScheduleFormValues } from "@/app/features/schedule";
import { ScheduleForm } from "@/app/components/app-schedule/schedule-day-popover/schedule-form/schedule-form";
import { useScheduleDayPopover } from "@/app/components/app-schedule/schedule-day-popover/use-schedule-day-popover";

export function ScheduleDayPopover({
  date,
  items,
  pending,
  onUpsert,
  onRemove,
}: {
  date: string;
  items: SavedScheduleItem[];
  pending: boolean;
  onUpsert: (values: ScheduleFormValues) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const popover = useScheduleDayPopover(items);

  return (
    <div className="grid gap-3">
      <PopoverHeader>
        <PopoverTitle>{formatScheduleDateLabel(date)}</PopoverTitle>
      </PopoverHeader>
      {items.length > 0 ? (
        <div className="grid gap-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted data-[active=true]:bg-muted"
              data-active={item.id === popover.selectedItem?.id}
              onClick={() => popover.selectItem(item.id)}
            >
              <span
                className="mt-1.5 size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                {item.description ? (
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
          {popover.selectedItem ? (
            <Button type="button" size="xs" variant="ghost" onClick={popover.startCreate}>
              Add
            </Button>
          ) : null}
        </div>
      ) : null}
      <ScheduleForm
        key={popover.selectedItem?.id ?? `new-${date}`}
        date={date}
        item={popover.selectedItem}
        pending={pending}
        onSubmit={onUpsert}
        onDelete={popover.selectedItem ? onRemove : undefined}
      />
    </div>
  );
}
