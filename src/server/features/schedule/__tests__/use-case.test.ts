import { describe, expect, it, vi } from "vitest";
import { saveSchedulesSchema } from "../contract";
import { loadSchedules, saveSchedules } from "../use-case";

const { readSavedSchedulesMock, writeSavedSchedulesMock } = vi.hoisted(() => ({
  readSavedSchedulesMock: vi.fn(),
  writeSavedSchedulesMock: vi.fn(),
}));

vi.mock("@/server/_shared/storage", () => ({
  readSavedSchedules: readSavedSchedulesMock,
  writeSavedSchedules: writeSavedSchedulesMock,
}));

const sample = saveSchedulesSchema.parse({
  items: [
    {
      id: "schedule-1",
      date: "2026-08-18",
      color: "#3b82f6",
      title: "Release",
      description: "Ship the schedule page",
    },
  ],
});

describe("schedule use-case", () => {
  it("loads schedules from storage", async () => {
    readSavedSchedulesMock.mockResolvedValueOnce(sample);

    await expect(loadSchedules()).resolves.toEqual(sample);
  });

  it("creates an empty document when storage has no items", async () => {
    readSavedSchedulesMock.mockResolvedValueOnce({ items: [] });

    await expect(loadSchedules()).resolves.toEqual({ items: [] });
  });

  it("writes parsed schedules and returns them", async () => {
    writeSavedSchedulesMock.mockResolvedValueOnce(undefined);

    await expect(saveSchedules(sample)).resolves.toEqual(sample);
    expect(writeSavedSchedulesMock).toHaveBeenCalledWith(sample);
  });
});
