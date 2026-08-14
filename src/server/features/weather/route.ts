import { Hono } from "hono";
import { jsonError } from "@/server/_shared/http";
import { fetchTomorrowWeather } from "./use-case";

export const weatherApp = new Hono().get("/weather", async (c) => {
  try {
    return c.json({ forecasts: await fetchTomorrowWeather() });
  } catch (error) {
    return jsonError(c, 502, error, "Failed to fetch tomorrow's weather");
  }
});
