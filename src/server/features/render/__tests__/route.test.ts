import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../route";

const snapshot = {
  status: "idle" as const,
  progress: 0,
  videoPath: null,
  updatedAt: 1,
  lastError: null,
};

const {
  cancelRenderMock,
  readRenderSnapshotMock,
  startRenderMock,
  subscribeRenderMock,
  readFileMock,
} = vi.hoisted(() => ({
  cancelRenderMock: vi.fn(),
  readRenderSnapshotMock: vi.fn(),
  startRenderMock: vi.fn(),
  subscribeRenderMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock("../render-state", () => ({
  cancelRender: cancelRenderMock,
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
    readRenderSnapshotMock.mockReturnValue(snapshot);

    const response = await renderApp.request("/render");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(snapshot);
  });

  it("streams snapshots over SSE", async () => {
    readRenderSnapshotMock.mockReturnValue(snapshot);
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

  it("cancels a running render", async () => {
    cancelRenderMock.mockReturnValueOnce({ canceled: true });

    const response = await renderApp.request("/render/cancel", { method: "POST" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ canceled: true });
    expect(cancelRenderMock).toHaveBeenCalled();
  });

  it("returns not_running when nothing is rendering", async () => {
    cancelRenderMock.mockReturnValueOnce({ canceled: false, reason: "not_running" });

    const response = await renderApp.request("/render/cancel", { method: "POST" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ canceled: false, reason: "not_running" });
  });
});
