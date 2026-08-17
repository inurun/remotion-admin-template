import { describe, expect, it } from "vitest";
import {
  collectNiconicoParentWorkIds,
  extractNiconicoVideoId,
  getProjectVideoSizePresetId,
  mergeParentWorkIds,
  normalizeProjectMeta,
} from "../project-meta";

describe("project meta", () => {
  it("normalizes unsupported project sizes to landscape", () => {
    expect(
      normalizeProjectMeta({
        title: "Demo",
        description: "",
        width: 999,
        height: 999,
      }),
    ).toEqual({
      title: "Demo",
      description: "",
      width: 1920,
      height: 1080,
      weather: {},
      niconico: {
        title: "",
        description: "",
        thumbnailTime: "00:00.000",
        parentWorkIds: [],
      },
    });
  });

  it("keeps frame metadata while normalizing size", () => {
    expect(
      normalizeProjectMeta({
        title: "Demo",
        description: "",
        width: 1920,
        height: 1080,
        updatedAt: "2026-07-27T09:40:00.000Z",
        weather: {
          tokyo: {
            temperatureC: 23,
            precipitationProbability: 50,
            condition: "cloudy",
          },
        },
      }),
    ).toMatchObject({
      updatedAt: "2026-07-27T09:40:00.000Z",
      weather: {
        tokyo: {
          temperatureC: 23,
          precipitationProbability: 50,
          condition: "cloudy",
        },
      },
    });
  });

  it("normalizes niconico parent work ids", () => {
    expect(
      normalizeProjectMeta({
        title: "Demo",
        niconico: {
          title: "  Nico  ",
          description: "desc",
          thumbnailTime: "01:23.456",
          parentWorkIds: ["sm9", " bad ", "sm9", "ss1"],
        },
      }).niconico,
    ).toEqual({
      title: "Nico",
      description: "desc",
      thumbnailTime: "01:23.456",
      parentWorkIds: ["sm9", "ss1"],
    });
  });

  it("resolves video size preset ids", () => {
    expect(getProjectVideoSizePresetId({ width: 1280, height: 1280 })).toBe("square");
    expect(getProjectVideoSizePresetId({ width: 1080, height: 1920 })).toBe("portrait");
    expect(getProjectVideoSizePresetId({ width: 999, height: 999 })).toBe("landscape");
  });

  it("extracts niconico video ids from watch and shorts urls", () => {
    expect(extractNiconicoVideoId("https://www.nicovideo.jp/watch/sm9")).toBe("sm9");
    expect(extractNiconicoVideoId("https://nicovideo.jp/shorts/ss123")).toBe("ss123");
    expect(extractNiconicoVideoId("https://www.nicovideo.jp/watch/sm9?ref=x")).toBe("sm9");
    expect(extractNiconicoVideoId("http://www.nicovideo.jp/watch/sm9")).toBeUndefined();
    expect(extractNiconicoVideoId("https://www.youtube.com/watch?v=abc")).toBeUndefined();
    expect(extractNiconicoVideoId("not a url")).toBeUndefined();
  });

  it("collects unique niconico parent work ids from urls", () => {
    expect(
      collectNiconicoParentWorkIds([
        "https://www.nicovideo.jp/watch/sm9",
        "https://www.youtube.com/watch?v=abc",
        "https://www.nicovideo.jp/watch/sm9",
        "https://www.nicovideo.jp/shorts/ss1",
      ]),
    ).toEqual(["sm9", "ss1"]);
  });

  it("merges parent work ids without removing existing ones", () => {
    expect(mergeParentWorkIds(["ss1", "sm9"], ["sm9", "sm10"])).toEqual(["ss1", "sm9", "sm10"]);
  });
});
