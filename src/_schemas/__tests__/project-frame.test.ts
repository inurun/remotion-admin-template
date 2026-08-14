import { describe, expect, it } from "vitest";
import { draftProjectSchema, savedProjectSchema } from "../project";

describe("project frame schema", () => {
  it("defaults frame metadata for projects and pages", () => {
    const project = savedProjectSchema.parse({
      meta: {
        title: "project",
        description: "",
        width: 1920,
        height: 1080,
      },
      bgm: [],
      pages: [
        {
          id: "page",
          title: "",
          type: "main",
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1,
          richText: "",
          tts: [],
        },
      ],
    });

    expect(project.meta.weather).toEqual({});
    expect(project.pages[0]?.meta).toEqual({ tags: [] });
  });

  it("accepts configured weather and rejects invalid precipitation", () => {
    const base = {
      title: "project",
      description: "",
      width: 1920,
      height: 1080,
      updatedAt: "2026-07-27T09:40:00.000Z",
    };

    expect(
      savedProjectSchema.parse({
        meta: {
          ...base,
          weather: {
            tokyo: {
              temperatureC: 23,
              precipitationProbability: 50,
              condition: "cloudy",
            },
          },
        },
        bgm: [],
        pages: [],
      }).meta.weather,
    ).toHaveProperty("tokyo.condition", "cloudy");

    expect(() =>
      savedProjectSchema.parse({
        meta: {
          ...base,
          weather: {
            tokyo: {
              temperatureC: 23,
              precipitationProbability: 101,
              condition: "rain",
            },
          },
        },
        bgm: [],
        pages: [],
      }),
    ).toThrow();
  });

  it("trims page tags and rejects empty tags", () => {
    const page = {
      id: "page",
      title: "",
      type: "main",
      padBeforeSec: 0,
      padAfterSec: 0,
      richText: "",
      tts: [],
    } as const;

    expect(
      draftProjectSchema.parse({
        meta: {},
        bgm: [],
        pages: [{ ...page, meta: { tags: ["  tag  "] } }],
      }).pages[0]?.meta.tags,
    ).toEqual(["tag"]);

    expect(() =>
      draftProjectSchema.parse({
        meta: {},
        bgm: [],
        pages: [{ ...page, meta: { tags: [" "] } }],
      }),
    ).toThrow();
  });
});
