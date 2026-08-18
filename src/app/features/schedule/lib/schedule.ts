import { format } from "date-fns";
import type { SavedScheduleItem, SavedSchedules } from "@/_schemas";
import { tokyoDateFromYmd, toTokyoDate } from "@/_shared/lib/date/date";
import { DEFAULT_SCHEDULE_COLOR } from "@/app/features/schedule/lib/colors";

export type ScheduleDateGroup = {
  date: string;
  items: SavedScheduleItem[];
};

export function sortScheduleItems(items: SavedScheduleItem[]) {
  return [...items].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }
    return left.title.localeCompare(right.title);
  });
}

export function filterSchedulesByMonth(items: SavedScheduleItem[], yearMonth: string) {
  return sortScheduleItems(items.filter((item) => item.date.startsWith(`${yearMonth}-`)));
}

export function groupSchedulesByDate(items: SavedScheduleItem[]): ScheduleDateGroup[] {
  const groups = new Map<string, SavedScheduleItem[]>();
  for (const item of sortScheduleItems(items)) {
    const group = groups.get(item.date) ?? [];
    group.push(item);
    groups.set(item.date, group);
  }

  return [...groups.entries()].map(([date, groupedItems]) => ({
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
    date: input.date,
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

export function formatScheduleMonthLabel(value: Date) {
  return format(toTokyoDate(value), "MMMM yyyy");
}
