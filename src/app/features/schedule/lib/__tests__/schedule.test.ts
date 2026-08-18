import { describe, expect, it } from "vitest";
import {
  createScheduleItem,
  filterSchedulesByMonth,
  formatScheduleDateLabel,
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
    date: "2026-08-18",
    color: "#ef4444",
    title: "Beta",
    description: "",
  },
  {
    id: "a",
    date: "2026-08-02",
    color: "#3b82f6",
    title: "Alpha",
    description: "first",
  },
  {
    id: "c",
    date: "2026-09-01",
    color: "#22c55e",
    title: "Next month",
    description: "",
  },
  {
    id: "d",
    date: "2026-08-18",
    color: "#3b82f6",
    title: "Alpha later",
    description: "",
  },
];

describe("schedule helpers", () => {
  it("filters and sorts items for a month", () => {
    expect(filterSchedulesByMonth(items, "2026-08").map((item) => item.id)).toEqual([
      "a",
      "d",
      "b",
    ]);
  });

  it("groups items by date", () => {
    expect(groupSchedulesByDate(filterSchedulesByMonth(items, "2026-08"))).toEqual([
      {
        date: "2026-08-02",
        items: [items[1]],
      },
      {
        date: "2026-08-18",
        items: [items[3], items[0]],
      },
    ]);
  });

  it("indexes items by date", () => {
    expect(
      scheduleItemsByDate(filterSchedulesByMonth(items, "2026-08"))["2026-08-18"]?.map(
        (item) => item.id,
      ),
    ).toEqual(["d", "b"]);
  });

  it("upserts and removes items", () => {
    const created = createScheduleItem({
      id: "e",
      date: "2026-08-20",
      color: "#8b5cf6",
      title: "New",
      description: "",
    });
    const withCreated = upsertScheduleItem(items, created);
    expect(withCreated.map((item) => item.id)).toContain("e");

    const updated = upsertScheduleItem(withCreated, { ...created, title: "Updated" });
    expect(updated.find((item) => item.id === "e")?.title).toBe("Updated");
    expect(removeScheduleItem(updated, "e").map((item) => item.id)).not.toContain("e");
  });

  it("formats English date labels", () => {
    expect(formatScheduleDateLabel("2026-08-18")).toBe("Tue, Aug 18");
    expect(formatScheduleMonthLabel(new Date("2026-08-18T00:00:00+09:00"))).toBe("August 2026");
  });
});
