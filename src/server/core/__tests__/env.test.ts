import { describe, expect, it, vi } from "vitest";
import type { Context } from "hono";
import { getServerEnv } from "../env";

const { envMock } = vi.hoisted(() => ({
  envMock: vi.fn(),
}));

vi.mock("hono/adapter", () => ({
  env: envMock,
}));

describe("getServerEnv", () => {
  it("normalizes supported server env values", () => {
    envMock.mockReturnValueOnce({
      NEXT_PUBLIC_VIDEO_FPS: " 30 ",
      VITE_VIDEO_FPS: "'60'",
      HAQUMEI_API_URL: '" http://127.0.0.1:8080 "',
      VOICEPEAK_PATH: " /Applications/voicepeak.app/Contents/MacOS/voicepeak ",
      EXTRA_VALUE: "ignored",
    });

    expect(getServerEnv({} as Context)).toEqual({
      NEXT_PUBLIC_VIDEO_FPS: "30",
      VITE_VIDEO_FPS: "60",
      HAQUMEI_API_URL: "http://127.0.0.1:8080",
      VOICEPEAK_PATH: "/Applications/voicepeak.app/Contents/MacOS/voicepeak",
    });
  });
});
