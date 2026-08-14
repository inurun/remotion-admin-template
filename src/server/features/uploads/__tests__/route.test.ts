import fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { uploadsApp } from "../route";

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock("@/server/_shared/storage", async () => {
  const actual = await vi.importActual<typeof import("@/server/_shared/storage")>(
    "@/server/_shared/storage",
  );
  return {
    ...actual,
    UPLOADS_DIR: "/tmp/uploads",
    ensureProjectDirs: vi.fn(),
  };
});

describe("upload routes", () => {
  it("rejects missing projectPath", async () => {
    const formData = new FormData();
    formData.set("file", new File(["png"], "test.png", { type: "image/png" }));

    const response = await uploadsApp.request("/uploads/image", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "projectPath is required" });
  });

  it("rejects unsupported image types", async () => {
    const formData = new FormData();
    formData.set("projectPath", "project");
    formData.set("file", new File(["x"], "test.svg", { type: "image/svg+xml" }));

    const response = await uploadsApp.request("/uploads/image", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "unsupported image type" });
  });

  it("stores supported images", async () => {
    const formData = new FormData();
    formData.set("projectPath", "group/demo");
    formData.set("file", new File(["png"], "test.png", { type: "image/png" }));

    const response = await uploadsApp.request("/uploads/image", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(200);
    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      src: expect.stringMatching(/^\/uploads\/group\/demo\/.+\.png$/),
    });
  });

  it("rejects unsupported video types", async () => {
    const formData = new FormData();
    formData.set("projectPath", "project");
    formData.set("file", new File(["x"], "test.avi", { type: "video/x-msvideo" }));

    const response = await uploadsApp.request("/uploads/video", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "unsupported video type" });
  });

  it("stores supported videos", async () => {
    const formData = new FormData();
    formData.set("projectPath", "project");
    formData.set("file", new File(["mp4"], "test.mp4", { type: "video/mp4" }));

    const response = await uploadsApp.request("/uploads/video", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(200);
    expect(fs.writeFile).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      src: expect.stringMatching(/^\/uploads\/project\/.+\.mp4$/),
    });
  });
});
