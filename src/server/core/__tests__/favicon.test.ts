import { describe, expect, it } from "vitest";
import { createApp } from "../api";

describe("favicon", () => {
  it("serves the SVG icon", async () => {
    const response = await createApp().request("/favicon.svg");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    await expect(response.text()).resolves.toContain("<svg");
  });

  it("serves byte ranges of public assets", async () => {
    const response = await createApp().request("/favicon.svg", {
      headers: { Range: "bytes=0-3" },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toMatch(/^bytes 0-3\/\d+$/u);
    await expect(response.text()).resolves.toBe("<?xm");
  });

  it("returns 404 for missing media", async () => {
    expect((await createApp().request("/tts/missing/voice.wav")).status).toBe(404);
  });
});
