import { Card, CardContent, CardHeader, CardTitle } from "@/_shared/components/ui/card";
import { ScheduleCalendar } from "@/app/components/app-schedule/schedule-calendar/schedule-calendar";
import { ScheduleMonthList } from "@/app/components/app-schedule/schedule-month-list/schedule-month-list";
import { useAppSchedule } from "@/app/components/app-schedule/use-app-schedule";

export function AppSchedule() {
  const schedule = useAppSchedule();

  return (
    <>
      <header className="grid gap-1">
        <h1 className="font-heading text-xl font-bold tracking-tight">Schedule</h1>
      </header>
      <div className="grid gap-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,25rem)_minmax(22rem,1fr)] lg:overflow-hidden">
        <Card className="h-fit min-w-0 self-start">
          <CardContent className="pt-2">
            <ScheduleCalendar
              month={schedule.month}
              onMonthChange={schedule.setMonth}
              itemsByDate={schedule.itemsByDate}
              pending={schedule.pending}
              onUpsert={schedule.upsert}
              onRemove={schedule.remove}
            />
          </CardContent>
        </Card>
        <Card className="flex min-h-0 min-w-0 flex-col">
          <CardHeader>
            <CardTitle>This month</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto">
            <ScheduleMonthList
              items={schedule.monthItems}
              pending={schedule.pending}
              onUpsert={schedule.upsert}
              onRemove={schedule.remove}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
