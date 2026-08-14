import { TZDate } from "@date-fns/tz";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export const TOKYO_TIME_ZONE = "Asia/Tokyo";

export function toTimestampMs(value: string | number | Date): number {
  if (typeof value === "number") {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return parseISO(value).getTime();
}

export function toTokyoDate(value: string | number | Date): TZDate {
  return new TZDate(toTimestampMs(value), TOKYO_TIME_ZONE);
}

export function formatTokyoClock(value: string | number | Date): string {
  return format(toTokyoDate(value), "HHmm");
}

export function formatTokyoDate(value: string | number | Date) {
  const tokyo = toTokyoDate(value);
  return {
    date: format(tokyo, "yyyy/MM/dd"),
    weekday: format(tokyo, "EEEE", { locale: ja }),
  };
}

/** e.g. `2026年8月9日の日記` */
export function formatTokyoDiaryLabel(value: string | number | Date): string {
  return format(toTokyoDate(value), "yyyy年M月d日の日記", { locale: ja });
}

/** UTC ISO-8601 with milliseconds, e.g. `2026-08-09T11:36:16.548Z`. */
export function nowIso(): string {
  return new Date().toISOString();
}

export function toIso(value: string | number | Date): string {
  return new Date(toTimestampMs(value)).toISOString();
}
