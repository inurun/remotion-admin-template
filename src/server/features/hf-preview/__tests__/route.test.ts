import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROJECT_META, DEFAULT_VOICE_PRESETS, EMPTY_TIMELINE } from "@/_schemas";
import { ProjectNotFoundError } from "@/server/_shared/storage";
import { hfPreviewApp } from "../route";

const { loadProjectMock, loadSchedulesMock } = vi.hoisted(() => ({
  loadProjectMock: vi.fn(),
  loadSchedulesMock: vi.fn(),
}));

vi.mock("@/server/features/project/use-case", () => ({ loadProject: loadProjectMock }));
vi.mock("@/server/features/schedule/use-case", () => ({ loadSchedules: loadSchedulesMock }));

const project = {
  meta: DEFAULT_PROJECT_META,
  pages: [],
  bgm: [],
  voicePresets: DEFAULT_VOICE_PRESETS,
};

describe("hf preview routes", () => {
  beforeEach(() => {
    loadProjectMock.mockReset();
    loadSchedulesMock.mockReset();
    loadSchedulesMock.mockResolvedValue({ items: [] });
  });

  it("returns the composition HTML for a nested project path", async () => {
    loadProjectMock.mockResolvedValueOnce({ project, timeline: EMPTY_TIMELINE });

    const response = await hfPreviewApp.request("/hf-preview/2026/10%20oct?d=1");

    expect(loadProjectMock).toHaveBeenCalledWith("2026/10 oct");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('id="hf-data"');
    expect(html).toContain('src="/hf/src/video-host/entry.tsx"');
  });

  it("returns 404 for a missing project", async () => {
    loadProjectMock.mockRejectedValueOnce(new ProjectNotFoundError("missing"));

    const response = await hfPreviewApp.request("/hf-preview/missing");

    expect(response.status).toBe(404);
  });

  it("serves the pinned HF runtime", async () => {
    const response = await hfPreviewApp.request("/hf-runtime");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("javascript");
    expect(await response.text()).toContain("registerRuntimeDataHandler");
  });
});
