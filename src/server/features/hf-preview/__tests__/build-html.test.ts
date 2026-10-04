// @vitest-environment happy-dom
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_META,
  DEFAULT_VOICE_PRESETS,
  BGM_TRACK_ID,
  SEQUENCE_TRACK_ID,
  type SavedPage,
  type SavedProject,
} from "@/_schemas";
import { assetsFromManifest } from "../bundle-assets";
import { buildCompositionHtml } from "../build-html";
import { SYSTEM_FONT_FAMILIES } from "../system-fonts";

const project: SavedProject = {
  meta: {
    ...DEFAULT_PROJECT_META,
    title: "</script><script>alert(1)</script>",
    width: 1280,
    height: 720,
  },
  pages: [],
  bgm: [],
  voicePresets: DEFAULT_VOICE_PRESETS,
};
const timeline = { durationSec: 10.01, tracks: [{ id: SEQUENCE_TRACK_ID, clips: [] }] };
const schedules = { items: [] };

function build() {
  return buildCompositionHtml({
    project,
    timeline,
    schedules,
    fps: 30,
    mode: "preview",
    assets: { scripts: ["/hf/assets/entry.js"], styles: ["/hf/assets/entry.css"] },
    runtimeSrc: "/hf-runtime",
  });
}

function readData(html: string) {
  const match = html.match(/<script type="application\/json" id="hf-data">(.*?)<\/script>/s);
  return JSON.parse(match?.[1] ?? "null");
}

describe("buildCompositionHtml", () => {
  it("uses the full timeline duration rounded up to whole frames", () => {
    const html = build();
    expect(html).toContain(`data-duration="${301 / 30}"`);
    expect(html).toContain('data-fps="30"');
    expect(html).toContain('data-width="1280"');
    expect(html).toContain('data-height="720"');
    expect(html).toContain('data-composition-id="video"');
    expect(html).toContain('data-mode="preview"');
  });

  it("embeds the data as JSON that cannot close its script tag", () => {
    const html = build();
    expect(html.match(/<\/script>/g)?.length).toBe(3);
    expect(readData(html)).toEqual({ project, timeline, schedules });
  });

  it("loads the runtime before the bundle and resolves assets from the root", () => {
    const html = build();
    expect(html).toContain('<base href="/" />');
    expect(html).toContain('<link rel="stylesheet" href="/hf/assets/entry.css" />');
    expect(html.indexOf('src="/hf-runtime"')).toBeLessThan(
      html.indexOf('type="module" src="/hf/assets/entry.js"'),
    );
  });

  it("resolves relative URLs against the given base", () => {
    const html = buildCompositionHtml({
      project,
      timeline,
      schedules,
      fps: 30,
      mode: "preview",
      assets: { scripts: [], styles: [] },
      baseHref: "file:///tmp/public/",
    });
    expect(html).toContain('<base href="file:///tmp/public/" />');
  });

  it("writes one static <audio> per manifest clip inside the composition", () => {
    const eyecatch: SavedPage = {
      id: "eye",
      title: "",
      type: "intro",
      meta: { tags: [] },
      padBeforeSec: 0,
      padAfterSec: 0,
      richText: null,
      tts: [
        {
          id: 'a"b',
          provider: "voisona",
          text: "",
          voiceName: "3",
          padBeforeSec: 0,
          padAfterSec: 0,
          volume: 0.7,
          audio: { status: "ready", src: "/tts/a&b.wav", durationSec: 1 },
          speech: {},
        },
      ],
    };
    const html = buildCompositionHtml({
      project: {
        ...project,
        pages: [eyecatch],
        bgm: [
          { src: "x.mp3", startSec: null, endSec: null, fadeIn: true, fadeOut: false, volume: 1 },
        ],
      },
      timeline: {
        durationSec: 2,
        tracks: [
          {
            id: SEQUENCE_TRACK_ID,
            clips: [
              {
                id: "eye",
                startSec: 0,
                durationSec: 2,
                clips: [{ id: 'a"b', startSec: 0.5, durationSec: 1, clips: [] }],
              },
            ],
          },
          {
            id: BGM_TRACK_ID,
            clips: [
              {
                id: "bgm-0",
                startSec: 0,
                durationSec: 2,
                clips: [
                  { id: "bgm-0-0", startSec: 0, durationSec: 1.5, clips: [] },
                  { id: "bgm-0-1", startSec: 1.5, durationSec: 0.5, clips: [] },
                ],
              },
            ],
          },
        ],
      },
      schedules,
      fps: 30,
      mode: "preview",
      assets: { scripts: [], styles: [] },
    });
    const doc = new DOMParser().parseFromString(html, "text/html");
    const audios = [...doc.querySelectorAll("[data-composition-id] > #hf-audio > audio")];

    expect(audios.map((audio) => audio.id)).toEqual(["bgm-0-0", "bgm-0-1", 'tts-eye-a"b']);
    const [bgm, nextPlay, tts] = audios;
    expect(bgm?.getAttribute("src")).toBe("bgm/x.mp3");
    expect(bgm?.hasAttribute("loop")).toBe(false);
    expect(nextPlay?.getAttribute("data-start")).toBe("1.5");
    expect(nextPlay?.hasAttribute("data-media-start")).toBe(false);
    expect(bgm?.hasAttribute("data-volume")).toBe(false);
    expect(JSON.parse(bgm?.getAttribute("data-automation") ?? "").lanes[0].target).toBe("volume");
    expect(
      Object.fromEntries(
        tts?.getAttributeNames().map((name) => [name, tts.getAttribute(name)]) ?? [],
      ),
    ).toEqual({
      id: 'tts-eye-a"b',
      src: "tts/a%26b.wav",
      preload: "auto",
      "data-start": "0.5",
      "data-duration": "1",
      "data-track-index": "102",
      "data-volume": "0.7",
    });
  });

  it("declares the system font families so the HF compiler keeps them", () => {
    const html = build();
    expect(html).toContain(
      '@font-face { font-family: "LINE Seed JP"; src: local("LINE Seed JP"); }',
    );
  });

  it("opts render into HF's browser media probe only for rich-text videos", () => {
    const withVideo = (richText: string, mode: "preview" | "render") =>
      buildCompositionHtml({
        project: {
          ...project,
          pages: [
            {
              id: "main",
              title: "",
              type: "main",
              meta: { tags: [] },
              padBeforeSec: 0,
              padAfterSec: 0,
              richText,
              tts: [],
            },
          ],
        },
        timeline,
        schedules,
        fps: 30,
        mode,
        assets: { scripts: [], styles: [] },
      });
    const marker = /<script>[^<]*createElement\("video"\)[^<]*<\/script>/;
    expect(withVideo('<video src="/uploads/a.mp4"></video>', "render")).toMatch(marker);
    expect(withVideo('<video src="/uploads/a.mp4"></video>', "preview")).not.toMatch(marker);
    expect(withVideo("<p>text</p>", "render")).not.toMatch(marker);
  });

  it("omits the runtime script when the host injects it", () => {
    const html = buildCompositionHtml({
      project,
      timeline,
      schedules,
      fps: 30,
      mode: "preview",
      assets: { scripts: [], styles: [] },
    });
    expect(html).not.toContain("hf-runtime");
  });
});

describe("SYSTEM_FONT_FAMILIES", () => {
  it("matches the quoted names in the globals.css --font-* tokens", () => {
    const css = fs.readFileSync("src/app/globals.css", "utf8");
    const families = [...css.matchAll(/--font-[\w-]+\s*:\s*([^;]+);/g)].flatMap(([, value]) =>
      [...(value ?? "").matchAll(/"([^"]+)"/g)].map(([, name]) => name),
    );
    expect(SYSTEM_FONT_FAMILIES).toEqual([...new Set(families)]);
  });
});

describe("assetsFromManifest", () => {
  it("maps the entry chunk and its css under the base", () => {
    expect(
      assetsFromManifest(
        { "src/entry.tsx": { file: "assets/entry-abc.js", css: ["assets/entry-def.css"] } },
        "src/entry.tsx",
        "/hf/",
      ),
    ).toEqual({ scripts: ["/hf/assets/entry-abc.js"], styles: ["/hf/assets/entry-def.css"] });
  });

  it("throws when the entry was not built", () => {
    expect(() => assetsFromManifest({}, "src/entry.tsx", "/hf/")).toThrow(/manifest/);
  });
});
