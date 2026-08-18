import type { ScheduleDateGroup } from "@/app/features/schedule";

export function useScheduleMonthList(groups: ScheduleDateGroup[]) {
  return { groups, isEmpty: groups.length === 0 };
}
