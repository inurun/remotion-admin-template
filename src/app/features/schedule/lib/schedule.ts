import { eachDayOfInterval, format, lastDayOfMonth } from "date-fns";
import type { SavedScheduleItem, SavedSchedules } from "@/_schemas";
import { formatTokyoYmd, tokyoDateFromYmd, toTokyoDate } from "@/_shared/lib/date/date";
import { DEFAULT_SCHEDULE_COLOR } from "@/app/features/schedule/lib/colors";

export type ScheduleDateGroup = {
  date: string;
  items: SavedScheduleItem[];
};

export function sortScheduleItems(items: SavedScheduleItem[]) {
  return [...items].sort((left, right) => {
    if (left.startDate !== right.startDate) {
      return left.startDate.localeCompare(right.startDate);
    }
    if (left.endDate !== right.endDate) {
      return left.endDate.localeCompare(right.endDate);
    }
    return left.title.localeCompare(right.title);
  });
}

export function filterSchedulesByMonth(items: SavedScheduleItem[], yearMonth: string) {
  const monthStart = `${yearMonth}-01`;
  const monthEnd = formatTokyoYmd(lastDayOfMonth(tokyoDateFromYmd(monthStart)));
  return sortScheduleItems(
    items.filter((item) => item.startDate <= monthEnd && item.endDate >= monthStart),
  );
}

function eachYmdInclusive(startDate: string, endDate: string) {
  return eachDayOfInterval({
    start: tokyoDateFromYmd(startDate),
    end: tokyoDateFromYmd(endDate),
  }).map((day) => formatTokyoYmd(day));
}

export function groupSchedulesByDate(items: SavedScheduleItem[]): ScheduleDateGroup[] {
  const groups = new Map<string, SavedScheduleItem[]>();
  for (const item of sortScheduleItems(items)) {
    for (const date of eachYmdInclusive(item.startDate, item.endDate)) {
      const group = groups.get(date) ?? [];
      group.push(item);
      groups.set(date, group);
    }
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, groupedItems]) => ({
      date,
      items: groupedItems,
    }));
}

export function scheduleItemsByDate(
  items: SavedScheduleItem[],
): Record<string, SavedScheduleItem[]> {
  return Object.fromEntries(groupSchedulesByDate(items).map((group) => [group.date, group.items]));
}

export function upsertScheduleItem(
  items: SavedScheduleItem[],
  item: SavedScheduleItem,
): SavedScheduleItem[] {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index < 0) {
    return sortScheduleItems([...items, item]);
  }

  return sortScheduleItems(items.map((candidate) => (candidate.id === item.id ? item : candidate)));
}

export function removeScheduleItem(items: SavedScheduleItem[], id: string): SavedScheduleItem[] {
  return items.filter((item) => item.id !== id);
}

export function createScheduleItem(
  input: Omit<SavedScheduleItem, "id"> & { id?: string },
): SavedScheduleItem {
  return {
    id: input.id ?? crypto.randomUUID(),
    startDate: input.startDate,
    endDate: input.endDate,
    color: input.color || DEFAULT_SCHEDULE_COLOR,
    title: input.title,
    description: input.description,
  };
}

export function emptySchedules(): SavedSchedules {
  return { items: [] };
}

export function formatScheduleDateLabel(ymd: string) {
  return format(tokyoDateFromYmd(ymd), "EEE, MMM d");
}

export function formatScheduleDateRangeLabel(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatScheduleDateLabel(startDate);
  }
  return `${formatScheduleDateLabel(startDate)} – ${formatScheduleDateLabel(endDate)}`;
}

export function formatScheduleMonthLabel(value: Date) {
  return format(toTokyoDate(value), "MMMM yyyy");
}
