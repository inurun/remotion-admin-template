import type { WeatherForecasts } from "@/_schemas";
import { api } from "@/_shared/lib/api-client";
import { parseApiJson } from "@/_shared/lib/fetch-json";

export async function fetchTomorrowWeather(): Promise<WeatherForecasts> {
  const response = await parseApiJson<{ forecasts: WeatherForecasts }>(await api.weather.$get());
  return response.forecasts;
}
