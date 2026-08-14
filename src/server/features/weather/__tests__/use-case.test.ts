import { describe, expect, it, vi } from "vitest";
import { WEATHER_LOCATIONS } from "@/features/weather";
import { fetchTomorrowWeather } from "../use-case";

function createLocationResponse({
  temperatureC = 20.4,
  precipitationProbability = 30,
  weatherCode = 0,
}: {
  temperatureC?: number;
  precipitationProbability?: number;
  weatherCode?: number;
} = {}) {
  return {
    daily: {
      time: ["2026-08-01", "2026-08-02"],
      temperature_2m_max: [19, temperatureC],
      precipitation_probability_max: [10, precipitationProbability],
      weather_code: [1, weatherCode],
    },
  };
}

function createFetchResponse(payload: unknown, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("fetchTomorrowWeather", () => {
  it("maps every configured location and rounds tomorrow's temperature", async () => {
    const payload = WEATHER_LOCATIONS.map((_, index) =>
      createLocationResponse({
        temperatureC: 20.4 + index,
        precipitationProbability: index * 10,
        weatherCode: 0,
      }),
    );
    const fetcher = createFetchResponse(payload);

    const forecasts = await fetchTomorrowWeather(fetcher);

    expect(Object.keys(forecasts)).toEqual(WEATHER_LOCATIONS.map((location) => location.id));
    expect(forecasts.tokyo).toEqual({
      temperatureC: 20,
      precipitationProbability: 0,
      condition: "clear",
    });
    expect(forecasts.osaka?.temperatureC).toBe(21);

    const requestUrl = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(requestUrl.searchParams.get("forecast_days")).toBe("2");
    expect(requestUrl.searchParams.get("timezone")).toBe("auto");
  });

  it.each([
    [0, "clear"],
    [2, "cloudy"],
    [63, "rain"],
    [75, "snow"],
    [95, "storm"],
  ] as const)("maps WMO code %s to %s", async (weatherCode, condition) => {
    const forecasts = await fetchTomorrowWeather(
      createFetchResponse(WEATHER_LOCATIONS.map(() => createLocationResponse({ weatherCode }))),
    );

    expect(forecasts.tokyo?.condition).toBe(condition);
  });

  it("rejects a response with missing locations", async () => {
    await expect(
      fetchTomorrowWeather(createFetchResponse([createLocationResponse()])),
    ).rejects.toThrow("every configured location");
  });

  it("rejects missing tomorrow data", async () => {
    const invalid = createLocationResponse();
    invalid.daily.temperature_2m_max = [20];

    await expect(
      fetchTomorrowWeather(
        createFetchResponse([
          invalid,
          ...WEATHER_LOCATIONS.slice(1).map(() => createLocationResponse()),
        ]),
      ),
    ).rejects.toThrow();
  });

  it("rejects unsupported WMO codes", async () => {
    await expect(
      fetchTomorrowWeather(
        createFetchResponse(
          WEATHER_LOCATIONS.map(() => createLocationResponse({ weatherCode: 100 })),
        ),
      ),
    ).rejects.toThrow("Unsupported WMO weather code");
  });

  it("rejects invalid precipitation values", async () => {
    await expect(
      fetchTomorrowWeather(
        createFetchResponse(
          WEATHER_LOCATIONS.map(() => createLocationResponse({ precipitationProbability: 101 })),
        ),
      ),
    ).rejects.toThrow();
  });

  it("rejects unsuccessful upstream responses", async () => {
    await expect(fetchTomorrowWeather(createFetchResponse({}, 503))).rejects.toThrow("HTTP 503");
  });
});
