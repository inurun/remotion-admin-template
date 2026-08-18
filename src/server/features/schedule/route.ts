import { Hono } from "hono";
import { jsonError } from "@/server/_shared/http";
import { scheduleContract } from "./contract";
import { loadSchedules, saveSchedules } from "./use-case";

export const scheduleApp = new Hono()
  .get("/schedules", async (c) => {
    try {
      return c.json(scheduleContract.load.response.parse(await loadSchedules()));
    } catch (error) {
      return jsonError(c, 500, error, "Failed to load schedules");
    }
  })
  .put("/schedules", async (c) => {
    try {
      const json = scheduleContract.save.json.parse(await c.req.json());
      return c.json(scheduleContract.save.response.parse(await saveSchedules(json)));
    } catch (error) {
      return jsonError(c, 500, error, "Failed to save schedules");
    }
  });
