import { z } from "zod";
import type { WeatherForecasts } from "@/_schemas";
import { WEATHER_LOCATION_IDS, WEATHER_LOCATIONS } from "@/features/weather";

const weatherConditionSchema = z.enum(["clear", "cloudy", "rain", "storm", "snow"]);

const weatherFormEntrySchema = z
  .object({
    location: z.enum(WEATHER_LOCATION_IDS),
    enabled: z.boolean(),
    temperatureC: z.string(),
    precipitationProbability: z.string(),
    condition: weatherConditionSchema,
  })
  .superRefine((entry, context) => {
    if (!entry.enabled) {
      return;
    }

    const temperatureC = Number(entry.temperatureC.trim());
    if (!entry.temperatureC.trim() || !Number.isFinite(temperatureC)) {
      context.addIssue({
        code: "custom",
        path: ["temperatureC"],
        message: "Temperature is required",
      });
    }

    const precipitationProbability = Number(entry.precipitationProbability.trim());
    if (
      !entry.precipitationProbability.trim() ||
      !Number.isInteger(precipitationProbability) ||
      precipitationProbability < 0 ||
      precipitationProbability > 100
    ) {
      context.addIssue({
        code: "custom",
        path: ["precipitationProbability"],
        message: "Use an integer from 0 to 100",
      });
    }
  });

export const weatherFormSchema = z.object({
  entries: z.array(weatherFormEntrySchema).length(WEATHER_LOCATIONS.length),
});

export type WeatherFormValues = z.infer<typeof weatherFormSchema>;

export function toWeatherFormValues(forecasts: WeatherForecasts): WeatherFormValues {
  return {
    entries: WEATHER_LOCATIONS.map((location) => {
      const forecast = forecasts[location.id];
      return {
        location: location.id,
        enabled: Boolean(forecast),
        temperatureC: forecast ? String(forecast.temperatureC) : "",
        precipitationProbability: forecast ? String(forecast.precipitationProbability) : "",
        condition: forecast?.condition ?? "clear",
      };
    }),
  };
}

export function fromWeatherFormValues(values: WeatherFormValues): WeatherForecasts {
  return Object.fromEntries(
    values.entries.flatMap((entry) =>
      entry.enabled
        ? [
            [
              entry.location,
              {
                temperatureC: Number(entry.temperatureC.trim()),
                precipitationProbability: Number(entry.precipitationProbability.trim()),
                condition: entry.condition,
              },
            ],
          ]
        : [],
    ),
  );
}
