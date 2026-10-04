import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serveFile } from "@/server/_shared/serve-file";

const bytes = Uint8Array.from({ length: 1000 }, (_, index) => index % 256);
let dir: string;
let filePath: string;

function request(headers: Record<string, string> = {}, method = "GET") {
  return serveFile(filePath, { headers: new Headers(headers), method }, "audio/wav");
}

async function body(response: Response) {
  return new Uint8Array(await response.arrayBuffer());
}

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "serve-file-"));
  filePath = path.join(dir, "voice.wav");
  await fs.writeFile(filePath, bytes);
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("serveFile", () => {
  it("returns the full body with Accept-Ranges and validators", async () => {
    const response = await request();

    expect(response.status).toBe(200);
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.get("Content-Type")).toBe("audio/wav");
    expect(response.headers.get("Content-Length")).toBe("1000");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
    expect(response.headers.get("ETag")).toMatch(/^W\/"/u);
    expect(response.headers.get("Last-Modified")).toBeTruthy();
    expect(await body(response)).toEqual(bytes);
  });

  it("returns 206 for a bounded range", async () => {
    const response = await request({ Range: "bytes=100-199" });

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 100-199/1000");
    expect(response.headers.get("Content-Length")).toBe("100");
    expect(await body(response)).toEqual(bytes.slice(100, 200));
  });

  it("returns 206 for an open-ended range", async () => {
    const response = await request({ Range: "bytes=100-" });

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 100-999/1000");
    expect(response.headers.get("Content-Length")).toBe("900");
    expect(await body(response)).toEqual(bytes.slice(100));
  });

  it("returns 206 for a suffix range", async () => {
    const response = await request({ Range: "bytes=-100" });

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 900-999/1000");
    expect(response.headers.get("Content-Length")).toBe("100");
    expect(await body(response)).toEqual(bytes.slice(900));
  });

  it("returns 416 for an unsatisfiable range", async () => {
    const response = await request({ Range: "bytes=1000-1100" });

    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */1000");
  });

  it("ignores a range whose If-Range no longer matches", async () => {
    const response = await request({ Range: "bytes=100-199", "If-Range": 'W/"stale"' });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Length")).toBe("1000");
  });

  it("returns 304 when the ETag still matches", async () => {
    const etag = (await request()).headers.get("ETag") ?? "";
    const response = await request({ "If-None-Match": etag });

    expect(response.status).toBe(304);
  });

  it("changes the ETag when the file is rewritten", async () => {
    const before = (await request()).headers.get("ETag");
    await fs.writeFile(filePath, bytes.slice(0, 500));
    const after = (await request()).headers.get("ETag");
    await fs.writeFile(filePath, bytes);

    expect(after).not.toBe(before);
  });

  it("omits the body for HEAD", async () => {
    const response = await request({}, "HEAD");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Length")).toBe("1000");
    expect(response.body).toBeNull();
  });

  it("rejects missing files and directories", async () => {
    await expect(
      serveFile(path.join(dir, "missing.wav"), { headers: new Headers(), method: "GET" }, "x"),
    ).rejects.toThrow();
    await expect(serveFile(dir, { headers: new Headers(), method: "GET" }, "x")).rejects.toThrow();
  });
});
