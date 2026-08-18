import { describe, expect, it } from "vitest";
import { getJobStatusLabel, getStatusChipClass, getVideoHref } from "./use-render-dialog.lib";

describe("render dialog values", () => {
  it("builds a cache-busted video href from updatedAt", () => {
    expect(
      getVideoHref({
        videoPath: "/api/render/video",
        updatedAt: 42,
      }),
    ).toBe("/api/render/video?t=42");
  });

  it("omits the video href when no video is ready", () => {
    expect(getVideoHref({ videoPath: null, updatedAt: 42 })).toBeUndefined();
  });

  it("labels the active job phase and status", () => {
    expect(getJobStatusLabel("render", "running")).toBe("render:running");
    expect(getJobStatusLabel("publish", "success")).toBe("publish:success");
    expect(getJobStatusLabel("render", "canceled")).toBe("render:canceled");
  });

  it("styles canceled like idle instead of error", () => {
    expect(getStatusChipClass("canceled")).toBe(getStatusChipClass("idle"));
    expect(getStatusChipClass("error")).not.toBe(getStatusChipClass("canceled"));
  });
});
