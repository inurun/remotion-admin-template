import { describe, expect, it } from "vitest";
import {
  createScheduleItem,
  filterSchedulesByMonth,
  formatScheduleDateLabel,
  formatScheduleDateRangeLabel,
  formatScheduleMonthLabel,
  groupSchedulesByDate,
  removeScheduleItem,
  scheduleItemsByDate,
  upsertScheduleItem,
} from "../schedule";
import type { SavedScheduleItem } from "@/_schemas";

const items: SavedScheduleItem[] = [
  {
    id: "b",
    startDate: "2026-08-18",
    endDate: "2026-08-18",
    color: "#ef4444",
    title: "Beta",
    description: "",
  },
  {
    id: "a",
    startDate: "2026-08-02",
    endDate: "2026-08-02",
    color: "#3b82f6",
    title: "Alpha",
    description: "first",
  },
  {
    id: "c",
    startDate: "2026-09-01",
    endDate: "2026-09-01",
    color: "#22c55e",
    title: "Next month",
    description: "",
  },
  {
    id: "d",
    startDate: "2026-08-18",
    endDate: "2026-08-18",
    color: "#3b82f6",
    title: "Alpha later",
    description: "",
  },
  {
    id: "e",
    startDate: "2026-08-31",
    endDate: "2026-09-04",
    color: "#39c5bb",
    title: "Range",
    description: "",
  },
];

describe("schedule helpers", () => {
  it("filters items that overlap a month", () => {
    expect(filterSchedulesByMonth(items, "2026-08").map((item) => item.id)).toEqual([
      "a",
      "d",
      "b",
      "e",
    ]);
    expect(filterSchedulesByMonth(items, "2026-09").map((item) => item.id)).toEqual(["e", "c"]);
  });

  it("groups items by each date in the range", () => {
    const augustGroups = groupSchedulesByDate(filterSchedulesByMonth(items, "2026-08"));
    expect(augustGroups.filter((group) => group.date.startsWith("2026-08"))).toEqual([
      {
        date: "2026-08-02",
        items: [items[1]],
      },
      {
        date: "2026-08-18",
        items: [items[3], items[0]],
      },
      {
        date: "2026-08-31",
        items: [items[4]],
      },
    ]);
    expect(
      groupSchedulesByDate([items[4]])
        .map((group) => group.date)
        .join(","),
    ).toBe("2026-08-31,2026-09-01,2026-09-02,2026-09-03,2026-09-04");
  });

  it("indexes the same range item on every expanded date", () => {
    const byDate = scheduleItemsByDate([items[4]]);
    expect(byDate["2026-08-31"]?.map((item) => item.id)).toEqual(["e"]);
    expect(byDate["2026-09-02"]?.map((item) => item.id)).toEqual(["e"]);
    expect(byDate["2026-08-18"]).toBeUndefined();
  });

  it("upserts and removes items", () => {
    const created = createScheduleItem({
      id: "f",
      startDate: "2026-08-20",
      endDate: "2026-08-20",
      color: "#8b5cf6",
      title: "New",
      description: "",
    });
    const withCreated = upsertScheduleItem(items, created);
    expect(withCreated.map((item) => item.id)).toContain("f");

    const updated = upsertScheduleItem(withCreated, { ...created, title: "Updated" });
    expect(updated.find((item) => item.id === "f")?.title).toBe("Updated");
    expect(removeScheduleItem(updated, "f").map((item) => item.id)).not.toContain("f");
  });

  it("formats English date labels", () => {
    expect(formatScheduleDateLabel("2026-08-18")).toBe("Tue, Aug 18");
    expect(formatScheduleDateRangeLabel("2026-08-18", "2026-08-18")).toBe("Tue, Aug 18");
    expect(formatScheduleDateRangeLabel("2026-08-31", "2026-09-04")).toBe(
      "Mon, Aug 31 – Fri, Sep 4",
    );
    expect(formatScheduleMonthLabel(new Date("2026-08-18T00:00:00+09:00"))).toBe("August 2026");
  });
});
