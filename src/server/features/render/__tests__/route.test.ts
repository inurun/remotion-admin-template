import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../route";

const snapshot = {
  status: "idle" as const,
  logs: ["hello"],
  videoPath: null,
  updatedAt: 1,
  lastError: null,
};

const { readRenderSnapshotMock, startRenderMock, subscribeRenderMock, readFileMock } = vi.hoisted(
  () => ({
    readRenderSnapshotMock: vi.fn(),
    startRenderMock: vi.fn(),
    subscribeRenderMock: vi.fn(),
    readFileMock: vi.fn(),
  }),
);

vi.mock("../render-state", () => ({
  readRenderSnapshot: readRenderSnapshotMock,
  startRender: startRenderMock,
  subscribeRender: subscribeRenderMock,
}));

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: readFileMock,
  },
}));

describe("render routes", () => {
  it("returns the current snapshot", async () => {
    readRenderSnapshotMock.mockResolvedValue(snapshot);

    const response = await renderApp.request("/render");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(snapshot);
  });

  it("streams snapshots over SSE", async () => {
    readRenderSnapshotMock.mockResolvedValue(snapshot);
    subscribeRenderMock.mockImplementation((listener: (value: typeof snapshot) => void) => {
      listener(snapshot);
      return () => undefined;
    });

    const response = await renderApp.request("/render/stream");
    expect(response.headers.get("content-type")).toBe("text/event-stream");

    const reader = response.body?.getReader();
    const chunk = await reader?.read();
    expect(new TextDecoder().decode(chunk?.value)).toContain('"status":"idle"');
  });

  it("serves the latest video file", async () => {
    readFileMock.mockResolvedValueOnce(Buffer.from("video"));

    const response = await renderApp.request("/render/video");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("video");
  });

  it("starts render for the selected project", async () => {
    startRenderMock.mockResolvedValueOnce({ started: true });

    const response = await renderApp.request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectPath: "nested/example" }),
    });

    expect(response.status).toBe(200);
    expect(startRenderMock).toHaveBeenCalledWith("nested/example");
  });
});
