import { describe, expect, it } from "vitest";
import { weatherForecastsSchema } from "@/_schemas/project/primitives";
import {
  DEFAULT_AVATAR_TYPE,
  avatarOptions,
  getAvatarTypeByVoiceName,
} from "@/_schemas/catalog/avatar";
import { WEATHER_LOCATION_IDS, WEATHER_LOCATIONS } from "@/_schemas/catalog/weather";

describe("catalog", () => {
  it("derives weather schema ids from locations", () => {
    expect(WEATHER_LOCATION_IDS).toEqual(WEATHER_LOCATIONS.map((location) => location.id));
    expect(
      weatherForecastsSchema.parse({
        tokyo: { temperatureC: 1, precipitationProbability: 0, condition: "clear" },
      }),
    ).toHaveProperty("tokyo");
  });

  it("resolves unknown voices to the catalog default avatar", () => {
    expect(DEFAULT_AVATAR_TYPE in avatarOptions).toBe(true);
    expect(getAvatarTypeByVoiceName("missing")).toBe(DEFAULT_AVATAR_TYPE);
  });
});
