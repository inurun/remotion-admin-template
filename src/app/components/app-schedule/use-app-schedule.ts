import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { SavedScheduleItem } from "@/_schemas";
import { formatTokyoYearMonth, formatTokyoYmd, tokyoDateFromYmd } from "@/_shared/lib/date/date";
import {
  createScheduleItem,
  filterSchedulesByMonth,
  formatScheduleMonthLabel,
  groupSchedulesByDate,
  removeScheduleItem,
  scheduleItemsByDate,
  upsertScheduleItem,
  useSchedulesQuery,
  type ScheduleFormValues,
} from "@/app/features/schedule";

export function useAppSchedule() {
  const { schedules, isLoading, saveSchedules } = useSchedulesQuery();
  const [month, setMonth] = useState<Date>(() => tokyoDateFromYmd(formatTokyoYmd(new Date())));
  const [pending, setPending] = useState(false);

  const yearMonth = formatTokyoYearMonth(month);
  const monthItems = useMemo(
    () => filterSchedulesByMonth(schedules.items, yearMonth),
    [schedules.items, yearMonth],
  );
  const dateGroups = useMemo(() => groupSchedulesByDate(monthItems), [monthItems]);
  const itemsByDate = useMemo(() => scheduleItemsByDate(monthItems), [monthItems]);
  const monthLabel = formatScheduleMonthLabel(month);

  const persist = useCallback(
    async (items: SavedScheduleItem[]) => {
      setPending(true);
      try {
        await saveSchedules({ items });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Schedule save failed");
        throw error;
      } finally {
        setPending(false);
      }
    },
    [saveSchedules],
  );

  const upsert = useCallback(
    async (values: ScheduleFormValues) => {
      await persist(
        upsertScheduleItem(
          schedules.items,
          createScheduleItem({
            id: values.id,
            date: values.date,
            color: values.color,
            title: values.title,
            description: values.description,
          }),
        ),
      );
    },
    [persist, schedules.items],
  );

  const remove = useCallback(
    async (id: string) => {
      await persist(removeScheduleItem(schedules.items, id));
    },
    [persist, schedules.items],
  );

  return {
    month,
    setMonth,
    monthLabel,
    dateGroups,
    itemsByDate,
    isLoading,
    pending,
    upsert,
    remove,
  };
}
