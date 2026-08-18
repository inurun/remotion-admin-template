import type { ComponentProps } from "react";
import { Calendar, CalendarDayButton } from "@/_shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/_shared/components/ui/popover";
import { cn } from "@/_shared/lib/utils";
import { ScheduleDayPopover } from "@/app/components/app-schedule/schedule-day-popover/schedule-day-popover";
import {
  ScheduleCalendarContext,
  useScheduleCalendar,
  useScheduleCalendarProviderValue,
  type ScheduleCalendarContextValue,
} from "@/app/components/app-schedule/schedule-calendar/use-schedule-calendar";

function ScheduleDayButton({
  children,
  className,
  ...props
}: ComponentProps<typeof CalendarDayButton>) {
  const calendar = useScheduleCalendar();
  const date = props.day.isoDate;
  const items = calendar.itemsByDate[date] ?? [];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <CalendarDayButton {...props} className={cn(className, "relative overflow-visible")}>
            {children}
            {items.length > 0 ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-0.5">
                {items.map((item) => (
                  <span
                    key={item.id}
                    className="block size-1 rounded-full ring-1 ring-background"
                    style={{ backgroundColor: item.color }}
                  />
                ))}
              </div>
            ) : null}
          </CalendarDayButton>
        }
      />
      <PopoverContent align="start" className="w-80 p-3">
        <ScheduleDayPopover
          date={date}
          items={items}
          pending={calendar.pending}
          onUpsert={calendar.onUpsert}
          onRemove={calendar.onRemove}
        />
      </PopoverContent>
    </Popover>
  );
}

export function ScheduleCalendar({
  month,
  onMonthChange,
  itemsByDate,
  pending,
  onUpsert,
  onRemove,
}: {
  month: Date;
  onMonthChange: (month: Date) => void;
} & ScheduleCalendarContextValue) {
  const value = useScheduleCalendarProviderValue({
    itemsByDate,
    pending,
    onUpsert,
    onRemove,
  });

  return (
    <ScheduleCalendarContext.Provider value={value}>
      <Calendar
        mode="single"
        month={month}
        onMonthChange={onMonthChange}
        className="w-full [--cell-size:--spacing(12)]"
        classNames={{ root: "w-full" }}
        components={{ DayButton: ScheduleDayButton }}
      />
    </ScheduleCalendarContext.Provider>
  );
}
