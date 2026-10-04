import type { SavedProject, SavedSchedules, SavedTimeline } from "@/_schemas";
import { HF_AUDIO_CONTAINER_ID, toAudioAttributes } from "@/video-host/audio/audio-attributes";
import { createAudioManifest } from "@/video-host/audio/audio-manifest";
import {
  HF_COMPOSITION_ID,
  HF_DATA_ELEMENT_ID,
  getTimelineDurationInFrames,
  type HfMode,
} from "@/video-host/constants";
import { audioConfig } from "@/video/config";
import { SYSTEM_FONT_FAMILIES } from "./system-fonts";

export type HfBundleAssets = {
  scripts: string[];
  styles: string[];
};

export type BuildCompositionHtmlInput = {
  project: SavedProject;
  timeline: SavedTimeline;
  schedules: SavedSchedules;
  fps: number;
  mode: HfMode;
  assets: HfBundleAssets;
  /** Classic script loaded before the bundle; omit when the host injects the runtime. */
  runtimeSrc?: string;
  /** Where relative `staticFile()` / audio URLs resolve: the public dir. Defaults to the site root. */
  baseHref?: string;
};

const escapeAttribute = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");

/** JSON inside `<script>`: `<` must not open `</script>` or `<!--`. */
const toScriptJson = (value: unknown) => JSON.stringify(value).replaceAll("<", "\\u003c");

/** CSS string inside `<style>`. */
const toCssString = (value: string) =>
  `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("<", "\\3c ")}"`;

/**
 * Declaring the family keeps the HF compiler from substituting a web font (it fetched
 * LINE Seed JP from Google Fonts). `local(<family>)` does not match a face, so Chrome falls
 * back to the installed family with all its weights — the same lookup Remotion renders with.
 */
const fontFaceRule = (family: string) =>
  `@font-face { font-family: ${toCssString(family)}; src: local(${toCssString(family)}); }`;

/**
 * HF render extracts frames only for videos it knows about: static `<video>` tags, plus the
 * live DOM when its browser probe runs. The probe is gated by `probeRequiresBrowser`, which
 * scans inline `<script>` text for runtime-created media; our bundle is external, so this
 * inline marker opts in. Without extraction Chrome captures the live `<video>` off-frame.
 * Rich-text `<video>` is the only video the composition mounts.
 */
const RUNTIME_VIDEO_PROBE_MARKER = `<script>/* hyperframes: runtime createElement("video") */</script>`;

const hasRuntimeVideo = (project: SavedProject) =>
  project.pages.some((page) => "richText" in page && /<video\b/i.test(page.richText ?? ""));

/**
 * The composition document, shared by the admin preview and the render. Audio must be static:
 * HF render ignores `<audio>` created at runtime.
 */
export function buildCompositionHtml(input: BuildCompositionHtmlInput) {
  const { project, timeline, schedules, fps, mode, assets, runtimeSrc, baseHref = "/" } = input;
  const { width, height } = project.meta;
  const durationSec = getTimelineDurationInFrames(timeline, fps) / fps;
  const head = [
    ...assets.styles.map((href) => `<link rel="stylesheet" href="${escapeAttribute(href)}" />`),
    ...(runtimeSrc ? [`<script src="${escapeAttribute(runtimeSrc)}"></script>`] : []),
    ...(mode === "render" && hasRuntimeVideo(project) ? [RUNTIME_VIDEO_PROBE_MARKER] : []),
  ];
  const body = assets.scripts.map(
    (src) => `<script type="module" src="${escapeAttribute(src)}"></script>`,
  );
  const audio = createAudioManifest(project, timeline, fps, audioConfig).map(
    (clip, index) =>
      `<audio ${toAudioAttributes(clip, index)
        .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
        .join(" ")}></audio>`,
  );

  // `<base>`: `staticFile()` paths are relative to the public dir.
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${width}, height=${height}" />
    <base href="${escapeAttribute(baseHref)}" />
    <style>
      html,
      body {
        margin: 0;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: #000;
      }
      [data-composition-id] {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      #${HF_AUDIO_CONTAINER_ID} {
        display: none;
      }
      ${SYSTEM_FONT_FAMILIES.map(fontFaceRule).join("\n      ")}
    </style>
    ${head.join("\n    ")}
  </head>
  <body>
    <div
      data-composition-id="${HF_COMPOSITION_ID}"
      data-start="0"
      data-duration="${durationSec}"
      data-fps="${fps}"
      data-mode="${mode}"
      data-width="${width}"
      data-height="${height}"
    >
      <div id="${HF_AUDIO_CONTAINER_ID}">
        ${audio.join("\n        ")}
      </div>
    </div>
    <script type="application/json" id="${HF_DATA_ELEMENT_ID}">${toScriptJson({ project, timeline, schedules })}</script>
    ${body.join("\n    ")}
  </body>
</html>
`;
}
