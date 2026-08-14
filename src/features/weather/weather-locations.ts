export const WEATHER_LOCATIONS = [
  {
    id: "tokyo",
    label: "Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
  },
  {
    id: "osaka",
    label: "Osaka",
    latitude: 34.6937,
    longitude: 135.5023,
  },
] as const;

export type WeatherLocationId = (typeof WEATHER_LOCATIONS)[number]["id"];

export const WEATHER_LOCATION_IDS = WEATHER_LOCATIONS.map((location) => location.id) as [
  WeatherLocationId,
  ...WeatherLocationId[],
];
