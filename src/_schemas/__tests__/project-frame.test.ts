import { describe, expect, it } from "vitest";
import { isContentPage } from "../guards";
import { savedPageSchema, savedProjectSchema } from "../project";
import type { SavedPage } from "../project";

function firstContentPage(pages: Array<SavedPage | { type: string }>): SavedPage {
  const page = pages[0];
  if (!page || !isContentPage(page as SavedPage)) {
    throw new Error("expected content page");
  }
  return page as SavedPage;
}

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
    expect(firstContentPage(project.pages).meta).toEqual({ tags: [] });
    expect(project.voicePresets).toHaveLength(7);
  });

  it("keeps an explicit empty voicePresets list", () => {
    expect(
      savedProjectSchema.parse({
        meta: { title: "project", description: "", width: 1920, height: 1080 },
        bgm: [],
        pages: [],
        voicePresets: [],
      }).voicePresets,
    ).toEqual([]);
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
      durationSec: 1,
      richText: "",
      tts: [],
    } as const;

    expect(savedPageSchema.parse({ ...page, meta: { tags: ["  tag  "] } }).meta.tags).toEqual([
      "tag",
    ]);

    expect(() => savedPageSchema.parse({ ...page, meta: { tags: [" "] } })).toThrow();
  });

  it("defaults endcard meta lists", () => {
    const project = savedProjectSchema.parse({
      meta: { title: "project", description: "", width: 1920, height: 1080 },
      bgm: [],
      pages: [
        {
          id: "endcard",
          title: "Endcard",
          type: "endcard",
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 8,
          richText: null,
          tts: [],
        },
      ],
    });

    expect(project.pages[0]).toMatchObject({
      type: "endcard",
      meta: {
        tags: [],
        nicoadSource: "",
        credits: [],
        advertisers: [],
        messages: [],
      },
    });
  });

  it("defaults eyecatch-text meta tags", () => {
    const page = savedPageSchema.parse({
      id: "eyecatch",
      title: "Eyecatch",
      type: "eyecatch-text",
      padBeforeSec: 0,
      padAfterSec: 0,
      durationSec: 0.5,
      richText: null,
      tts: [],
    });

    expect(page).toMatchObject({
      type: "eyecatch-text",
      meta: { tags: [] },
    });
  });
});
