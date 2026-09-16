import { TZDate } from "@date-fns/tz";
import { format, parseISO } from "date-fns";

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

/** e.g. `2026-08-18` */
export function formatTokyoYmd(value: string | number | Date): string {
  return format(toTokyoDate(value), "yyyy-MM-dd");
}

/** e.g. `2026-08` */
export function formatTokyoYearMonth(value: string | number | Date): string {
  return format(toTokyoDate(value), "yyyy-MM");
}

export function tokyoDateFromYmd(ymd: string): TZDate {
  return new TZDate(`${ymd}T00:00:00+09:00`, TOKYO_TIME_ZONE);
}

/** UTC ISO-8601 with milliseconds, e.g. `2026-08-09T11:36:16.548Z`. */
export function nowIso(): string {
  return new Date().toISOString();
}

export function toIso(value: string | number | Date): string {
  return new Date(toTimestampMs(value)).toISOString();
}

function readTimeZoneEnv() {
  const processEnv =
    typeof process !== "undefined" && process.env ? process.env : ({} as Record<string, string>);
  const metaEnv =
    typeof import.meta !== "undefined"
      ? (import.meta.env as Record<string, string | undefined> | undefined)
      : undefined;
  return (
    processEnv["DISPLAY_TIME_ZONE"] ??
    metaEnv?.["DISPLAY_TIME_ZONE"] ??
    metaEnv?.["VITE_DISPLAY_TIME_ZONE"]
  );
}

export function resolveDisplayTimeZoneId() {
  const value = readTimeZoneEnv()?.trim();
  return value || TOKYO_TIME_ZONE;
}

export function formatInTimeZone(
  value: string | number | Date,
  pattern: string,
  timeZone = resolveDisplayTimeZoneId(),
) {
  return format(new TZDate(toTimestampMs(value), timeZone), pattern);
}

/** e.g. `18:40:00` in the display time zone */
export function formatClock(value: string | number | Date, timeZone = resolveDisplayTimeZoneId()) {
  return formatInTimeZone(value, "HH:mm:ss", timeZone);
}
