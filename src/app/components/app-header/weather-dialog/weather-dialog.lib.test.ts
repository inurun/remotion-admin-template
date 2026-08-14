import { describe, expect, it } from "vitest";
import { WEATHER_LOCATIONS } from "@/features/weather";
import {
  fromWeatherFormValues,
  toWeatherFormValues,
  weatherFormSchema,
} from "./weather-dialog.lib";

describe("weather dialog values", () => {
  it("round-trips an existing partial forecast", () => {
    const [first, second] = WEATHER_LOCATIONS;
    if (!first || !second) {
      throw new Error("Expected demo weather locations");
    }

    const formValues = toWeatherFormValues({
      [first.id]: {
        temperatureC: 31,
        precipitationProbability: 20,
        condition: "clear",
      },
      [second.id]: {
        temperatureC: 36,
        precipitationProbability: 10,
        condition: "cloudy",
      },
    });

    expect(formValues.entries.map(({ location, enabled }) => ({ location, enabled }))).toEqual(
      WEATHER_LOCATIONS.map((location) => ({
        location: location.id,
        enabled: location.id === first.id || location.id === second.id,
      })),
    );
    expect(fromWeatherFormValues(weatherFormSchema.parse(formValues))).toEqual({
      [first.id]: {
        temperatureC: 31,
        precipitationProbability: 20,
        condition: "clear",
      },
      [second.id]: {
        temperatureC: 36,
        precipitationProbability: 10,
        condition: "cloudy",
      },
    });
  });

  it("applies manual edits and omits excluded locations", () => {
    const values = toWeatherFormValues({
      tokyo: {
        temperatureC: 31,
        precipitationProbability: 20,
        condition: "clear",
      },
      osaka: {
        temperatureC: 25,
        precipitationProbability: 80,
        condition: "rain",
      },
    });
    const tokyo = values.entries[0];
    const osaka = values.entries[1];
    if (!tokyo || !osaka) {
      throw new Error("Expected configured weather rows");
    }
    tokyo.temperatureC = " 32.5 ";
    tokyo.precipitationProbability = "40";
    tokyo.condition = "storm";
    osaka.enabled = false;

    expect(fromWeatherFormValues(weatherFormSchema.parse(values))).toEqual({
      tokyo: {
        temperatureC: 32.5,
        precipitationProbability: 40,
        condition: "storm",
      },
    });
  });

  it("ignores blank disabled rows and rejects invalid enabled rows", () => {
    const values = toWeatherFormValues({});
    expect(weatherFormSchema.safeParse(values).success).toBe(true);

    const tokyo = values.entries[0];
    if (!tokyo) {
      throw new Error("Expected Tokyo weather row");
    }
    tokyo.enabled = true;
    tokyo.temperatureC = "";
    tokyo.precipitationProbability = "10.5";

    const result = weatherFormSchema.safeParse(values);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.slice(-1)[0])).toEqual([
        "temperatureC",
        "precipitationProbability",
      ]);
    }
  });
});
