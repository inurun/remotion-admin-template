import fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
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

async function pngFile(width: number, height: number, name = "test.png") {
  const buffer = await sharp({
    create: {
      background: { r: 255, g: 0, b: 0, alpha: 1 },
      channels: 3,
      height,
      width,
    },
  })
    .png()
    .toBuffer();

  return new File([buffer], name, { type: "image/png" });
}

describe("upload routes", () => {
  it("rejects missing projectPath", async () => {
    const formData = new FormData();
    formData.set("file", await pngFile(10, 10));

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

  it("stores resized webp images", async () => {
    const formData = new FormData();
    formData.set("projectPath", "group/demo");
    formData.set("file", await pngFile(2000, 1000));

    const response = await uploadsApp.request("/uploads/image", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(200);
    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      src: expect.stringMatching(/^\/uploads\/group\/demo\/.+\.webp$/),
    });

    const written = vi.mocked(fs.writeFile).mock.calls.at(-1)?.[1];
    expect(written).toBeInstanceOf(Buffer);
    const metadata = await sharp(written as Buffer).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1980);
    expect(metadata.height).toBe(990);
  });

  it("does not enlarge small images", async () => {
    const formData = new FormData();
    formData.set("projectPath", "group/demo");
    formData.set("file", await pngFile(100, 50));

    const response = await uploadsApp.request("/uploads/image", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(200);
    const written = vi.mocked(fs.writeFile).mock.calls.at(-1)?.[1];
    const metadata = await sharp(written as Buffer).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(50);
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
