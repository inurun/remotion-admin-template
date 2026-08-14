import { z } from "zod";

const openMeteoDailySchema = z.object({
  time: z.array(z.iso.date()).min(2),
  temperature_2m_max: z.array(z.number()).min(2),
  precipitation_probability_max: z.array(z.number().int().min(0).max(100)).min(2),
  weather_code: z.array(z.number().int()).min(2),
});

export const openMeteoForecastResponseSchema = z.object({
  daily: openMeteoDailySchema,
});
