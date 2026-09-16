import type { WeatherForecasts } from "@/_schemas";
import { api } from "@/app/lib/api-client";
import { parseApiJson } from "@/app/lib/fetch-json";

export async function fetchTomorrowWeather(): Promise<WeatherForecasts> {
  const response = await parseApiJson<{ forecasts: WeatherForecasts }>(await api.weather.$get());
  return response.forecasts;
}
