import { beforeEach, describe, expect, it, vi } from "vitest";
import { weatherApp } from "../route";

const { fetchTomorrowWeatherMock } = vi.hoisted(() => ({
  fetchTomorrowWeatherMock: vi.fn(),
}));

vi.mock("../use-case", () => ({
  fetchTomorrowWeather: fetchTomorrowWeatherMock,
}));

describe("weather routes", () => {
  beforeEach(() => {
    fetchTomorrowWeatherMock.mockReset();
  });

  it("returns tomorrow's forecasts", async () => {
    fetchTomorrowWeatherMock.mockResolvedValueOnce({
      tokyo: {
        temperatureC: 31,
        precipitationProbability: 20,
        condition: "clear",
      },
    });

    const response = await weatherApp.request("/weather");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      forecasts: {
        tokyo: {
          temperatureC: 31,
          precipitationProbability: 20,
          condition: "clear",
        },
      },
    });
  });

  it("returns bad gateway for upstream failures", async () => {
    fetchTomorrowWeatherMock.mockRejectedValueOnce(new Error("Open-Meteo is unavailable"));

    const response = await weatherApp.request("/weather");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Open-Meteo is unavailable" });
  });
});
