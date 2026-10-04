import { Hono } from "hono";
import { getHyperframeRuntimeScript } from "@hyperframes/core/runtime-script";
import { VIDEO_FPS } from "@/constants";
import { HF_PREVIEW_PATH, HF_RUNTIME_PATH } from "@/video-host/constants";
import { InvalidProjectPathError, ProjectNotFoundError } from "@/server/_shared/storage";
import { loadProject } from "@/server/features/project/use-case";
import { loadSchedules } from "@/server/features/schedule/use-case";
import { buildCompositionHtml } from "./build-html";
import { resolveBundleAssets } from "./bundle-assets";

function getPreviewErrorStatus(error: unknown) {
  if (error instanceof InvalidProjectPathError) {
    return 400;
  }
  if (error instanceof ProjectNotFoundError) {
    return 404;
  }
  return 500;
}

export const hfPreviewApp = new Hono()
  .get(HF_RUNTIME_PATH, (c) => {
    c.header("Content-Type", "text/javascript; charset=utf-8");
    c.header("Cache-Control", "no-cache");
    return c.body(getHyperframeRuntimeScript());
  })
  .get(`${HF_PREVIEW_PATH}/:projectPath{.+}`, async (c) => {
    try {
      const projectPath = decodeURIComponent(c.req.param("projectPath"));
      const [{ project, timeline }, schedules, assets] = await Promise.all([
        loadProject(projectPath),
        loadSchedules(),
        resolveBundleAssets(),
      ]);
      c.header("Cache-Control", "no-store");
      return c.html(
        buildCompositionHtml({
          project,
          timeline,
          schedules,
          fps: VIDEO_FPS,
          mode: "preview",
          assets,
          runtimeSrc: HF_RUNTIME_PATH,
        }),
      );
    } catch (error) {
      const status = getPreviewErrorStatus(error);
      if (status === 500) {
        console.error(`[hf-preview] ${c.req.path} ->`, error);
      }
      return c.text("Preview unavailable", status);
    }
  });
