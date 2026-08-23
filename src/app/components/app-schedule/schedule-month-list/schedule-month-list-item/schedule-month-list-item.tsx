import { Pencil, Trash2 } from "lucide-react";
import type { SavedScheduleItem } from "@/_schemas";
import { Button } from "@/_shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/_shared/components/ui/popover";
import { formatScheduleDateRangeLabel, type ScheduleFormValues } from "@/app/features/schedule";
import { ScheduleForm } from "@/app/components/app-schedule/schedule-day-popover/schedule-form/schedule-form";
import { useScheduleMonthListItem } from "@/app/components/app-schedule/schedule-month-list/schedule-month-list-item/use-schedule-month-list-item";

export function ScheduleMonthListItem({
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
  const row = useScheduleMonthListItem({ item, pending, onUpsert, onRemove });

  return (
    <article className="flex items-start gap-2 rounded-lg border border-border p-3">
      <span
        className="mt-1 size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: row.item.color }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          {formatScheduleDateRangeLabel(row.item.startDate, row.item.endDate)}
        </p>
        <p className="truncate text-sm font-medium">{row.item.title}</p>
        {row.item.description ? (
          <p className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">
            {row.item.description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <Popover>
          <PopoverTrigger
            render={<Button type="button" size="icon-xs" variant="ghost" title="Edit" />}
          >
            <Pencil />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-3">
            <ScheduleForm
              date={row.item.startDate}
              item={row.item}
              pending={row.pending}
              onSubmit={row.onUpsert}
              onDelete={row.onRemove}
            />
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          size="icon-xs"
          variant="destructive"
          title="Delete"
          disabled={row.pending}
          onClick={() => void row.onDelete()}
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
}
