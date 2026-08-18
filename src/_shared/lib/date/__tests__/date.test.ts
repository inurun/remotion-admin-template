import { describe, expect, it } from "vitest";
import {
  formatTokyoClock,
  formatTokyoDate,
  formatTokyoDiaryLabel,
  formatTokyoYmd,
  formatTokyoYearMonth,
  toTimestampMs,
  tokyoDateFromYmd,
} from "../date";

describe("tokyo date helpers", () => {
  it("formats clock digits in Asia/Tokyo", () => {
    expect(formatTokyoClock("2026-07-27T18:40:00+09:00")).toBe("1840");
  });

  it("formats date and weekday in Asia/Tokyo", () => {
    expect(formatTokyoDate("2026-07-27T18:40:00+09:00")).toEqual({
      date: "2026/07/27",
      weekday: "月曜日",
    });
    expect(formatTokyoDate("2026-07-26T16:00:00.000Z")).toEqual({
      date: "2026/07/27",
      weekday: "月曜日",
    });
  });

  it("formats diary labels in Asia/Tokyo", () => {
    expect(formatTokyoDiaryLabel("2026-08-09T11:36:16.548Z")).toBe("2026年8月9日の日記");
  });

  it("formats ymd and year-month in Asia/Tokyo", () => {
    expect(formatTokyoYmd("2026-08-18T00:30:00+09:00")).toBe("2026-08-18");
    expect(formatTokyoYmd("2026-08-17T16:00:00.000Z")).toBe("2026-08-18");
    expect(formatTokyoYearMonth("2026-08-18T00:30:00+09:00")).toBe("2026-08");
  });

  it("parses ISO timestamps", () => {
    expect(toTimestampMs("2026-07-27T18:40:00+09:00")).toBe(
      Date.parse("2026-07-27T18:40:00+09:00"),
    );
  });

  it("builds a Tokyo calendar date from ymd", () => {
    expect(formatTokyoYmd(tokyoDateFromYmd("2026-08-18"))).toBe("2026-08-18");
  });
});
