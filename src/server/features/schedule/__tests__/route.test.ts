import { beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleApp } from "../route";

const { loadSchedulesMock, saveSchedulesMock } = vi.hoisted(() => ({
  loadSchedulesMock: vi.fn(),
  saveSchedulesMock: vi.fn(),
}));

vi.mock("../use-case", () => ({
  loadSchedules: loadSchedulesMock,
  saveSchedules: saveSchedulesMock,
}));

const sample = {
  items: [
    {
      id: "schedule-1",
      date: "2026-08-18",
      color: "#3b82f6",
      title: "Release",
      description: "Ship the schedule page",
    },
  ],
};

describe("schedule routes", () => {
  beforeEach(() => {
    loadSchedulesMock.mockReset();
    saveSchedulesMock.mockReset();
  });

  it("returns schedules", async () => {
    loadSchedulesMock.mockResolvedValueOnce(sample);

    const response = await scheduleApp.request("/schedules");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(sample);
  });

  it("saves schedules", async () => {
    saveSchedulesMock.mockResolvedValueOnce(sample);

    const response = await scheduleApp.request("/schedules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sample),
    });

    expect(response.status).toBe(200);
    expect(saveSchedulesMock).toHaveBeenCalledWith(sample);
    expect(await response.json()).toEqual(sample);
  });

  it("returns an error when loading fails", async () => {
    loadSchedulesMock.mockRejectedValueOnce(new Error("disk full"));

    const response = await scheduleApp.request("/schedules");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "disk full" });
  });
});
