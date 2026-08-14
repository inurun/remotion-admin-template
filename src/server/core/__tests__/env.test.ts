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
      VOISONA_BASE: '" http://localhost:32766/api/talk/v1 "',
      VOISONA_PASSWORD: " 'password' ",
      VOISONA_USERNAME: " user@example.com ",
      VOICEVOX_URL: "  ",
      EXTRA_VALUE: "ignored",
    });

    expect(getServerEnv({} as Context)).toEqual({
      NEXT_PUBLIC_VIDEO_FPS: "30",
      VITE_VIDEO_FPS: "60",
      VOISONA_BASE: "http://localhost:32766/api/talk/v1",
      VOISONA_PASSWORD: "password",
      VOISONA_USERNAME: "user@example.com",
      VOICEVOX_URL: undefined,
    });
  });
});
