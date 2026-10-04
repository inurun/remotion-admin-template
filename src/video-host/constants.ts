// Constants shared by the admin, the preview HTML route, the HF entry and the Vite configs.
// No `@/` runtime imports: Vite config files load this without path aliases.
import type { SavedTimeline } from "@/_schemas";

export const HF_COMPOSITION_ID = "video";
/**
 * Root `data-mode`: a render waits for every async frame input (exact frames); a preview
 * mounts at once and fills such inputs in as they arrive.
 */
export type HfMode = "preview" | "render";
/** `<script type="application/json">` holding the initial preview data. */
export const HF_DATA_ELEMENT_ID = "hf-data";
/** `setRuntimeData` channel for edited (possibly unsaved) preview data. */
export const HF_DATA_CHANNEL = "video-data";
/** Base URL of the video bundle (separate Vite instance / `dist/hf`). */
export const HF_BUNDLE_BASE = "/hf/";
export const HF_ENTRY = "src/video-host/entry.tsx";
export const HF_PREVIEW_PATH = "/hf-preview";
// No `.js` extension: the Hono dev server skips `*.js` requests.
export const HF_RUNTIME_PATH = "/hf-runtime";

export function getTimelineDurationInFrames(timeline: SavedTimeline, fps: number) {
  return Math.max(1, Math.ceil(timeline.durationSec * fps));
}

/**
 * Root `data-*` attributes are static, so anything they depend on is part of the
 * URL: a change reloads the iframe instead of going through runtime data.
 */
export function getHfPreviewHref(
  projectPath: string,
  stage: { durationInFrames: number; width: number; height: number },
) {
  const path = projectPath.split("/").map(encodeURIComponent).join("/");
  const query = new URLSearchParams({
    d: String(stage.durationInFrames),
    w: String(stage.width),
    h: String(stage.height),
  });
  return `${HF_PREVIEW_PATH}/${path}?${query.toString()}`;
}
