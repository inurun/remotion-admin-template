import type { WeatherCondition, WeatherForecasts } from "@/_schemas";
import { WEATHER_LOCATIONS } from "@/features/weather";
import { openMeteoForecastResponseSchema } from "./contract";

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TOMORROW_INDEX = 1;

function getWeatherCondition(weatherCode: number): WeatherCondition {
  if (weatherCode === 0) {
    return "clear";
  }

  if ([1, 2, 3, 45, 48].includes(weatherCode)) {
    return "cloudy";
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
    return "rain";
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return "snow";
  }

  if ([95, 96, 99].includes(weatherCode)) {
    return "storm";
  }

  throw new Error(`Unsupported WMO weather code: ${weatherCode}`);
}

function createOpenMeteoUrl() {
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set(
    "latitude",
    WEATHER_LOCATIONS.map((location) => location.latitude).join(","),
  );
  url.searchParams.set(
    "longitude",
    WEATHER_LOCATIONS.map((location) => location.longitude).join(","),
  );
  url.searchParams.set(
    "daily",
    ["temperature_2m_max", "precipitation_probability_max", "weather_code"].join(","),
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "2");
  return url;
}

function getTomorrowForecast(response: unknown) {
  const parsed = openMeteoForecastResponseSchema.parse(response);
  const temperatureC = parsed.daily.temperature_2m_max[TOMORROW_INDEX];
  const precipitationProbability = parsed.daily.precipitation_probability_max[TOMORROW_INDEX];
  const weatherCode = parsed.daily.weather_code[TOMORROW_INDEX];

  if (
    temperatureC === undefined ||
    precipitationProbability === undefined ||
    weatherCode === undefined
  ) {
    throw new Error("Open-Meteo response is missing tomorrow's forecast");
  }

  return {
    temperatureC: Math.round(temperatureC),
    precipitationProbability,
    condition: getWeatherCondition(weatherCode),
  };
}

export async function fetchTomorrowWeather(
  fetcher: typeof fetch = fetch,
): Promise<WeatherForecasts> {
  const response = await fetcher(createOpenMeteoUrl(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload) || payload.length !== WEATHER_LOCATIONS.length) {
    throw new Error("Open-Meteo response does not contain every configured location");
  }

  return Object.fromEntries(
    WEATHER_LOCATIONS.map((location, index) => [location.id, getTomorrowForecast(payload[index])]),
  );
}
