import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveRuntimePublicFile } from "../../../../scripts/vite/serve-runtime-public-assets-plugin";

describe("runtime public assets", () => {
  it("serves generated uploads and TTS files without exposing other paths", () => {
    expect(resolveRuntimePublicFile("/uploads/project/image.png")).toBe(
      path.resolve("public/uploads/project/image.png"),
    );
    expect(resolveRuntimePublicFile("/tts/project/voice.wav")).toBe(
      path.resolve("public/tts/project/voice.wav"),
    );
    expect(resolveRuntimePublicFile("/src/private.ts")).toBeNull();
    expect(resolveRuntimePublicFile("/tts/../../private.wav")).toBeNull();
  });
});
