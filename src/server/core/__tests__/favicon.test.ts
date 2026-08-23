import { describe, expect, it } from "vitest";
import { createApp } from "../api";

describe("favicon", () => {
  it("serves the SVG icon", async () => {
    const response = await createApp().request("/favicon.svg");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    await expect(response.text()).resolves.toContain("<svg");
  });
});
