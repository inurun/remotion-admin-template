import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";
import { EYECATCH_TEXT_MIN_DURATION_SEC } from "@/_shared/lib/page/page-timing";
import { isSavedContentPage, type SavedPage, type SavedSequenceItem } from "@/_schemas";
import type { SaveSequenceItem } from "@/server/features/project/contract";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { HaqumeiApiError } from "@/server/features/haqumei-api/error";

const accessMock = vi.fn();
const readSavedProjectMock = vi.fn();
const writeSavedProjectMock = vi.fn();
const createSavedProjectMock = vi.fn();
const ensureSavedProjectFileMock = vi.fn();
const listSavedProjectsMock = vi.fn();
const analyzeTextsMock = vi.fn();
const synthesizeVoisonaMock = vi.fn();
const synthesizeVoicevoxMock = vi.fn();
const synthesizeVoicepeakMock = vi.fn();

vi.mock("node:fs/promises", () => ({
  default: {
    access: (...args: unknown[]) => accessMock(...args),
  },
}));

vi.mock("@/server/_shared/storage", async () => {
  const actual = await vi.importActual<typeof import("@/server/_shared/storage")>(
    "@/server/_shared/storage",
  );
  return {
    ...actual,
    createSavedProject: createSavedProjectMock,
    ensureSavedProjectFile: ensureSavedProjectFileMock,
    listSavedProjects: listSavedProjectsMock,
    readSavedProject: readSavedProjectMock,
    writeSavedProject: writeSavedProjectMock,
  };
});

vi.mock("@/server/features/haqumei-api/analyze", () => ({
  analyzeTexts: analyzeTextsMock,
}));

vi.mock("@/server/features/haqumei-api/synthesis", () => ({
  synthesizeVoisona: synthesizeVoisonaMock,
  synthesizeVoicevox: synthesizeVoicevoxMock,
}));

vi.mock("@/server/features/voicepeak/use-case", () => ({
  synthesizeVoicepeak: synthesizeVoicepeakMock,
}));

async function saveProject(
  serverEnv: object,
  projectPath: string,
  draft: {
    meta: unknown;
    bgm?: unknown;
    pages: Array<{ id: string } & Record<string, unknown>>;
    voicePresets?: unknown;
  },
) {
  const { saveProjectSettingsSchema } = await import("../contract");
  const { saveProjectChanges } = await import("../use-case");
  const result = await saveProjectChanges(serverEnv, projectPath, {
    project: saveProjectSettingsSchema.parse({
      meta: draft.meta,
      bgm: draft.bgm ?? [],
      ...(draft.voicePresets !== undefined ? { voicePresets: draft.voicePresets } : {}),
    }),
    upsertItems: draft.pages as SaveSequenceItem[],
    removedItemIds: [],
    sequenceOrder: draft.pages.map((page) => page.id),
  });
  return result.project;
}

function contentPage(pages: SavedSequenceItem[] | undefined, index = 0): SavedPage {
  const page = pages?.[index];
  if (!page || !isSavedContentPage(page)) {
    throw new Error("expected content page");
  }
  return page;
}

function audio(src: string, durationSec = 1) {
  return { audioSrc: src, outputPath: "/tmp/audio.wav", durationSec };
}

describe("project use-case", () => {
  const now = "2026-07-27T09:40:00.000Z";
  const defaultMeta = {
    title: "project",
    description: "",
    width: 1920,
    height: 1080,
    weather: {},
    niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
  };
  const helloG2p = createG2pItem("Hello");

  beforeEach(() => {
    vi.clearAllMocks();
    accessMock.mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reuses previous synthesized items when the input did not change", async () => {
    const previous = {
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1.2,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "Hello",
              voiceName: "voice",
              voiceVersion: "1",
              durationSec: 1.2,
              audio: { src: "/tts/nested/example/old.wav" },
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    };

    readSavedProjectMock.mockResolvedValueOnce(previous);
    const result = await saveProject({}, "nested/example", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "Hello",
              voiceName: "voice",
              voiceVersion: "1",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });

    expect(result).toEqual({
      meta: { ...defaultMeta, updatedAt: now },
      pages: [
        {
          ...previous.pages[0],
          tts: [
            {
              ...previous.pages[0].tts[0],
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
            },
          ],
        },
      ],
      bgm: [],
      voicePresets: getDefaultVoicePresets(),
    });
    expect(analyzeTextsMock).not.toHaveBeenCalled();
    expect(synthesizeVoisonaMock).not.toHaveBeenCalled();
    expect(writeSavedProjectMock).toHaveBeenCalledWith("nested/example", result);
  });

  it("updates avatar settings without regenerating unchanged tts", async () => {
    const previous = {
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1.2,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "Hello",
              voiceName: "voice",
              voiceVersion: "1",
              durationSec: 1.2,
              audio: { src: "/tts/project/old.wav" },
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    };
    const avatar = {
      base: "normal" as const,
      eyes: "glass" as const,
      mouth: "wavy-opened" as const,
    };

    readSavedProjectMock.mockResolvedValueOnce(previous);
    const result = await saveProject({}, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "Hello",
              voiceName: "voice",
              voiceVersion: "1",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: { g2p: helloG2p },
              avatar,
            },
          ],
        },
      ],
    });

    expect(contentPage(result.pages).tts[0]).toEqual({
      ...previous.pages[0]?.tts[0],
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      avatar,
    });
    expect(analyzeTextsMock).not.toHaveBeenCalled();
    expect(synthesizeVoisonaMock).not.toHaveBeenCalled();
  });

  it("batches analyze for multiple VOICEVOX and VoiSona tts", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    const first = createG2pItem("Hello");
    const second = createG2pItem("World");
    analyzeTextsMock.mockResolvedValueOnce([first, second]);
    synthesizeVoicevoxMock.mockResolvedValueOnce(audio("/tts/one.wav", 1));
    synthesizeVoisonaMock.mockResolvedValueOnce(audio("/tts/two.wav", 2));

    const serverEnv = {};
    const saved = await saveProject(serverEnv, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: null,
          tts: [
            {
              id: "tts-1",
              provider: "voicevox",
              text: "Hello",
              voiceName: "3",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: {},
            },
            {
              id: "tts-2",
              provider: "voisona",
              text: "World",
              voiceName: "voice",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: {},
            },
          ],
        },
      ],
    });

    expect(analyzeTextsMock).toHaveBeenCalledTimes(1);
    expect(analyzeTextsMock).toHaveBeenCalledWith(serverEnv, ["Hello", "World"]);
    expect(contentPage(saved.pages).tts.map((item) => item.speech.g2p)).toEqual([first, second]);
  });

  it("analyzes 74 tts items in one batch", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    const texts = Array.from({ length: 74 }, (_, index) => `text ${index}`);
    analyzeTextsMock.mockResolvedValueOnce(texts.map((text) => createG2pItem(text)));
    texts.forEach(() => {
      synthesizeVoicevoxMock.mockResolvedValueOnce(audio("/tts/batch.wav", 1));
    });

    const serverEnv = {};
    await saveProject(serverEnv, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: null,
          tts: texts.map((text, index) => ({
            id: `tts-${index}`,
            provider: "voicevox" as const,
            text,
            voiceName: "3",
            padBeforeSec: 0,
            padAfterSec: 0,
            volume: 1,
            speech: {},
          })),
        },
      ],
    });

    expect(analyzeTextsMock).toHaveBeenCalledTimes(1);
    expect(analyzeTextsMock).toHaveBeenCalledWith(serverEnv, texts);
  });

  it("does not synthesize or write when analyze fails", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeTextsMock.mockRejectedValueOnce(
      new HaqumeiApiError({
        type: "about:blank",
        title: "Analysis failed",
        status: 500,
        code: "analysis_failed",
        detail: 'texts[0] "Hello": mora mismatch: split=8 pitch_nuclei=7',
        errors: [{ path: "texts[0]", reason: "mora_mismatch" }],
      }),
    );

    await expect(
      saveProject({}, "project", {
        meta: defaultMeta,
        bgm: [],
        pages: [
          {
            id: "page-1",
            title: "Page 1",
            type: "main",
            meta: { tags: [] },
            padBeforeSec: 0,
            padAfterSec: 0,
            richText: null,
            tts: [
              {
                id: "tts-1",
                provider: "voicevox",
                text: "Hello",
                voiceName: "3",
                padBeforeSec: 0,
                padAfterSec: 0,
                volume: 1,
                speech: {},
              },
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({
      status: 500,
      code: "analysis_failed",
      message: 'texts[0] "Hello": mora mismatch: split=8 pitch_nuclei=7',
    });
    expect(synthesizeVoicevoxMock).not.toHaveBeenCalled();
    expect(synthesizeVoisonaMock).not.toHaveBeenCalled();
    expect(writeSavedProjectMock).not.toHaveBeenCalled();
  });

  it("keeps duplicate texts mapped by request index", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    const first = createG2pItem("Hello");
    const second = createG2pItem("Hello");
    second.segments[0]!.words[0]!.moras[0]!.pitch = "low";
    analyzeTextsMock.mockResolvedValueOnce([first, second]);
    synthesizeVoicevoxMock
      .mockResolvedValueOnce(audio("/tts/one.wav"))
      .mockResolvedValueOnce(audio("/tts/two.wav"));

    const saved = await saveProject({}, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: null,
          tts: [
            {
              id: "tts-1",
              provider: "voicevox",
              text: "Hello",
              voiceName: "3",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: {},
            },
            {
              id: "tts-2",
              provider: "voicevox",
              text: "Hello",
              voiceName: "3",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: {},
            },
          ],
        },
      ],
    });

    expect(analyzeTextsMock).toHaveBeenCalledWith({}, ["Hello", "Hello"]);
    expect(contentPage(saved.pages).tts[0]?.speech.g2p).toEqual(first);
    expect(contentPage(saved.pages).tts[1]?.speech.g2p).toEqual(second);
  });

  it("saves a freshly synthesized VOICEVOX project", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeTextsMock.mockResolvedValueOnce([helloG2p]);
    synthesizeVoicevoxMock.mockResolvedValueOnce(audio("/tts/voicevox.wav", 1));

    const serverEnv = {};
    const saved = await saveProject(serverEnv, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voicevox",
              text: "Hello",
              voiceName: "3",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              synthesisSettings: { speedScale: 1.3 },
              speech: {},
            },
          ],
        },
      ],
    });

    expect(synthesizeVoicevoxMock).toHaveBeenCalledWith({
      serverEnv,
      projectPath: "project",
      g2p: helloG2p,
      voiceName: "3",
      synthesisSettings: { speedScale: 1.3 },
    });
    expect(contentPage(saved.pages).tts[0]).toMatchObject({
      provider: "voicevox",
      durationSec: 1.1,
      audio: { src: "/tts/voicevox.wav" },
      speech: { g2p: helloG2p },
    });
  });

  it("synthesizes null tts with the project preset without baking it onto saved tts", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeTextsMock.mockResolvedValueOnce([helloG2p]);
    synthesizeVoicevoxMock.mockResolvedValueOnce(audio("/tts/voicevox.wav", 1));

    const serverEnv = {};
    const voicePresets = [
      {
        provider: "voicevox" as const,
        voiceName: "3",
        synthesisSettings: { speedScale: 1.2 },
      },
    ];
    const saved = await saveProject(serverEnv, "project", {
      meta: defaultMeta,
      bgm: [],
      voicePresets,
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voicevox",
              text: "Hello",
              voiceName: "3",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              synthesisSettings: null,
              speech: {},
            },
          ],
        },
      ],
    });

    expect(synthesizeVoicevoxMock).toHaveBeenCalledWith({
      serverEnv,
      projectPath: "project",
      g2p: helloG2p,
      voiceName: "3",
      synthesisSettings: { speedScale: 1.2 },
    });
    expect(contentPage(saved.pages).tts[0]?.synthesisSettings).toBeUndefined();
    expect(saved.voicePresets).toEqual(voicePresets);
  });

  it("resynthesizes without reanalyzing when H/L or chain changes", async () => {
    const edited = createG2pItem("Hello");
    edited.segments[0]!.words[0]!.moras[0]!.pitch = "low";
    edited.segments[0]!.words[0]!.chain = true;
    readSavedProjectMock.mockResolvedValueOnce({
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1.1,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voicevox",
              text: "Hello",
              readText: "Hello",
              voiceName: "3",
              durationSec: 1.1,
              audio: { src: "/tts/project/old.wav" },
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });
    synthesizeVoicevoxMock.mockResolvedValueOnce(audio("/tts/voicevox.wav", 1));

    await saveProject({}, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voicevox",
              text: "Hello",
              readText: "Hello",
              voiceName: "3",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: { g2p: edited },
            },
          ],
        },
      ],
    });

    expect(analyzeTextsMock).not.toHaveBeenCalled();
    expect(synthesizeVoicevoxMock).toHaveBeenCalledWith(expect.objectContaining({ g2p: edited }));
  });

  it("resynthesizes null tts when the project preset changes", async () => {
    readSavedProjectMock.mockResolvedValueOnce({
      voicePresets: [
        {
          provider: "voicevox",
          voiceName: "3",
          synthesisSettings: { speedScale: 1.2 },
        },
      ],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1.1,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voicevox",
              text: "Hello",
              readText: "Hello",
              voiceName: "3",
              durationSec: 1.1,
              audio: { src: "/tts/project/old.wav" },
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });
    synthesizeVoicevoxMock.mockResolvedValueOnce(audio("/tts/voicevox.wav", 1));

    const serverEnv = {};
    const saved = await saveProject(serverEnv, "project", {
      meta: defaultMeta,
      bgm: [],
      voicePresets: [
        {
          provider: "voicevox",
          voiceName: "3",
          synthesisSettings: { speedScale: 1.5 },
        },
      ],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voicevox",
              text: "Hello",
              readText: "Hello",
              voiceName: "3",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              synthesisSettings: null,
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });

    expect(analyzeTextsMock).not.toHaveBeenCalled();
    expect(synthesizeVoicevoxMock).toHaveBeenCalledWith({
      serverEnv,
      projectPath: "project",
      g2p: helloG2p,
      voiceName: "3",
      synthesisSettings: { speedScale: 1.5 },
    });
    expect(contentPage(saved.pages).tts[0]?.audio.src).toBe("/tts/voicevox.wav");
  });

  it("reuses an explicit tts override when the project preset changes", async () => {
    const previousTts = {
      id: "tts-1",
      provider: "voicevox" as const,
      text: "Hello",
      readText: "Hello",
      voiceName: "3",
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      durationSec: 1.1,
      synthesisSettings: { speedScale: 1.3 },
      audio: { src: "/tts/project/old.wav" },
      speech: { g2p: helloG2p },
    };
    readSavedProjectMock.mockResolvedValueOnce({
      voicePresets: [
        {
          provider: "voicevox",
          voiceName: "3",
          synthesisSettings: { speedScale: 1.2 },
        },
      ],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1.1,
          richText: "<p>Hello</p>",
          tts: [previousTts],
        },
      ],
    });

    const saved = await saveProject({}, "project", {
      meta: defaultMeta,
      bgm: [],
      voicePresets: [
        {
          provider: "voicevox",
          voiceName: "3",
          synthesisSettings: { speedScale: 1.9 },
        },
      ],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>Hello</p>",
          tts: [
            {
              ...previousTts,
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });

    expect(synthesizeVoicevoxMock).not.toHaveBeenCalled();
    expect(contentPage(saved.pages).tts[0]?.audio.src).toBe("/tts/project/old.wav");
  });

  it("saves a freshly synthesized VoicePeak project without analyze", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    synthesizeVoicepeakMock.mockResolvedValueOnce(audio("/tts/voicepeak.wav", 1.2));

    const serverEnv = {};
    const saved = await saveProject(serverEnv, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voicepeak",
              text: "Hello",
              voiceName: "Kasane Teto",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: {},
            },
          ],
        },
      ],
    });

    expect(analyzeTextsMock).not.toHaveBeenCalled();
    expect(synthesizeVoicepeakMock).toHaveBeenCalledWith({
      serverEnv,
      projectPath: "project",
      text: "Hello",
      voiceName: "Kasane Teto",
      synthesisSettings: {
        speed: 90,
        pitch: 0,
        emotion: {
          "teto-overactive": 10,
          "teto-low-key": 20,
          "teto-whisper": 20,
          "teto-powerful": 10,
          "teto-sweet": 30,
        },
      },
    });
    expect(contentPage(saved.pages).tts[0]).toMatchObject({
      provider: "voicepeak",
      durationSec: 1.3,
      audio: { src: "/tts/voicepeak.wav" },
      speech: {},
    });
  });

  it("saves normalized project meta", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });

    await expect(
      saveProject({}, "nested/example", {
        meta: {
          title: "  ",
          description: "Description",
          width: 999,
          height: 999,
          weather: {},
        },
        bgm: [],
        pages: [],
      }),
    ).resolves.toEqual({
      meta: {
        title: "example",
        description: "Description",
        width: 1920,
        height: 1080,
        updatedAt: now,
        weather: {},
        niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
      },
      bgm: [],
      pages: [],
      voicePresets: getDefaultVoicePresets(),
    });
  });

  it("reanalyzes changed readText before synthesizing", async () => {
    const nextG2p = createG2pItem("new read");
    readSavedProjectMock.mockResolvedValueOnce({
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1.2,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "old read",
              voiceName: "voice",
              voiceVersion: "1",
              durationSec: 1.2,
              audio: { src: "/tts/old.wav" },
              speech: { g2p: createG2pItem("old read") },
            },
          ],
        },
      ],
    });
    analyzeTextsMock.mockResolvedValueOnce([nextG2p]);
    synthesizeVoisonaMock.mockResolvedValueOnce(audio("/tts/new.wav", 1.5));

    const serverEnv = {};
    const saved = await saveProject(serverEnv, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "new read",
              voiceName: "voice",
              voiceVersion: "1",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: { g2p: createG2pItem("old read") },
            },
          ],
        },
      ],
    });

    expect(analyzeTextsMock).toHaveBeenCalledWith(serverEnv, ["new read"]);
    expect(synthesizeVoisonaMock).toHaveBeenCalledWith({
      serverEnv,
      projectPath: "project",
      g2p: nextG2p,
      voiceName: "voice",
      voiceVersion: "1",
    });
    expect(contentPage(saved.pages).tts[0]).toMatchObject({
      readText: "new read",
      speech: { g2p: nextG2p },
    });
  });

  it("reuses G2P and resynthesizes when provider changes between VOICEVOX and VoiSona", async () => {
    readSavedProjectMock.mockResolvedValueOnce({
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1.2,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voicevox",
              text: "Hello",
              readText: "Hello",
              voiceName: "3",
              durationSec: 1.2,
              audio: { src: "/tts/old.wav" },
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });
    synthesizeVoisonaMock.mockResolvedValueOnce(audio("/tts/new.wav", 1.5));

    const serverEnv = {};
    const saved = await saveProject(serverEnv, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "Hello",
              voiceName: "voice",
              voiceVersion: "1",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });

    expect(analyzeTextsMock).not.toHaveBeenCalled();
    expect(synthesizeVoisonaMock).toHaveBeenCalledWith({
      serverEnv,
      projectPath: "project",
      g2p: helloG2p,
      voiceName: "voice",
      voiceVersion: "1",
    });
    expect(contentPage(saved.pages).tts[0]).toMatchObject({
      provider: "voisona",
      speech: { g2p: helloG2p },
    });
  });

  it("resynthesizes when previous audio file is missing", async () => {
    accessMock.mockRejectedValueOnce(new Error("missing"));
    readSavedProjectMock.mockResolvedValueOnce({
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1.2,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "Hello",
              voiceName: "voice",
              voiceVersion: "1",
              durationSec: 1.2,
              audio: { src: "/tts/project/old.wav" },
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });
    synthesizeVoisonaMock.mockResolvedValueOnce(audio("/tts/project/new.wav", 1.5));

    const serverEnv = {};
    await saveProject(serverEnv, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "Hello",
              voiceName: "voice",
              voiceVersion: "1",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });

    expect(analyzeTextsMock).not.toHaveBeenCalled();
    expect(synthesizeVoisonaMock).toHaveBeenCalled();
  });

  it("rejects when a page is shorter than an adjacent transition", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    synthesizeVoisonaMock
      .mockResolvedValueOnce(audio("/tts/short.wav", 0.2))
      .mockResolvedValueOnce(audio("/tts/long.wav", 3));

    await expect(
      saveProject({}, "project", {
        meta: defaultMeta,
        bgm: [],
        pages: [
          {
            id: "page-short",
            title: "Short",
            type: "main",
            meta: { tags: [] },
            padBeforeSec: 0,
            padAfterSec: 0,
            richText: null,
            tts: [
              {
                id: "tts-short",
                provider: "voisona",
                text: "short",
                voiceName: "voice",
                speech: { g2p: createG2pItem("short") },
              },
            ],
          },
          {
            id: "tr-1",
            type: "transition",
            variant: "slide",
          },
          {
            id: "page-long",
            title: "Long",
            type: "main",
            meta: { tags: [] },
            padBeforeSec: 0,
            padAfterSec: 0,
            richText: null,
            tts: [
              {
                id: "tts-long",
                provider: "voisona",
                text: "long",
                voiceName: "voice",
                speech: { g2p: createG2pItem("long") },
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow(/must be at least as long as adjacent transition/);
    expect(writeSavedProjectMock).not.toHaveBeenCalled();
  });

  it("lists saved projects", async () => {
    const projects = [
      { path: "a", name: "a", segments: ["a"], updatedAt: 10 },
      { path: "nested/b", name: "b", segments: ["nested", "b"], updatedAt: 9 },
    ];
    listSavedProjectsMock.mockResolvedValueOnce(projects);

    const { listProjects } = await import("../use-case");
    await expect(listProjects()).resolves.toEqual(projects);
  });

  it("creates a blank project", async () => {
    const summary = {
      path: "new-project",
      name: "new-project",
      segments: ["new-project"],
      updatedAt: 1,
    };
    createSavedProjectMock.mockResolvedValueOnce(summary);

    const { createProject } = await import("../use-case");
    await expect(createProject("new-project")).resolves.toEqual(summary);
    expect(createSavedProjectMock).toHaveBeenCalledWith("new-project", {
      meta: {
        title: "new-project",
        description: "",
        width: 1920,
        height: 1080,
        updatedAt: now,
        weather: {},
        niconico: { title: "", description: "", thumbnailTime: "00:00.000", parentWorkIds: [] },
      },
      pages: [],
      bgm: [],
      voicePresets: getDefaultVoicePresets(),
    });
  });

  it("copies a saved project", async () => {
    const project = { meta: defaultMeta, pages: [], bgm: [] };
    const summary = {
      path: "copy",
      name: "copy",
      segments: ["copy"],
      updatedAt: 1,
    };
    readSavedProjectMock.mockResolvedValueOnce(project);
    createSavedProjectMock.mockResolvedValueOnce(summary);

    const { copyProject } = await import("../use-case");
    await expect(copyProject("source", "copy")).resolves.toEqual(summary);
  });

  it("saves an endcard page without tts using the fixed duration", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    const saved = await saveProject({}, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "endcard-1",
          title: "Endcard",
          type: "endcard",
          meta: {
            tags: [],
            nicoadSource: "sm46665240",
            credits: [{ id: "credit-1", title: "BGM", url: "https://example.com" }],
            advertisers: [{ id: "ad-1", name: "Ada", message: "hello" }],
            messages: [{ id: "msg-1", text: "Thank you for watching!" }],
          },
          padBeforeSec: 0.5,
          padAfterSec: 0.25,
          richText: null,
          tts: [],
        },
      ],
    });

    expect(contentPage(saved.pages)).toMatchObject({
      type: "endcard",
      durationSec: 8.75,
      tts: [],
    });
    expect(analyzeTextsMock).not.toHaveBeenCalled();
  });

  it("saves an eyecatch-text page without tts at the minimum duration", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    const saved = await saveProject({}, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "eyecatch-1",
          title: "Eyecatch",
          type: "eyecatch-text",
          meta: { tags: [] },
          padBeforeSec: 1,
          padAfterSec: 1,
          richText: null,
          tts: [],
        },
      ],
    });

    expect(contentPage(saved.pages)).toMatchObject({
      type: "eyecatch-text",
      durationSec: EYECATCH_TEXT_MIN_DURATION_SEC,
      tts: [],
    });
    expect(analyzeTextsMock).not.toHaveBeenCalled();
  });

  it("saves an eyecatch-text page duration from tts total without page pads", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeTextsMock.mockResolvedValueOnce([helloG2p]);
    synthesizeVoisonaMock.mockResolvedValueOnce(audio("/tts/eyecatch.wav", 2));

    const saved = await saveProject({}, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "eyecatch-1",
          title: "Eyecatch",
          type: "eyecatch-text",
          meta: { tags: [] },
          padBeforeSec: 1,
          padAfterSec: 1,
          richText: null,
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              voiceName: "voice",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: {},
            },
          ],
        },
      ],
    });

    expect(contentPage(saved.pages)).toMatchObject({
      type: "eyecatch-text",
      durationSec: 2.1,
    });
  });

  it("clamps a short eyecatch-text tts duration to the minimum", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeTextsMock.mockResolvedValueOnce([helloG2p]);
    synthesizeVoisonaMock.mockResolvedValueOnce(audio("/tts/eyecatch-short.wav", 0.2));

    const saved = await saveProject({}, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "eyecatch-1",
          title: "Eyecatch",
          type: "eyecatch-text",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: null,
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              voiceName: "voice",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: {},
            },
          ],
        },
      ],
    });

    expect(contentPage(saved.pages)).toMatchObject({
      type: "eyecatch-text",
      durationSec: EYECATCH_TEXT_MIN_DURATION_SEC,
    });
  });

  it("does not analyze or synthesize an unchanged page B when only page A is upserted", async () => {
    const pageB = {
      id: "page-b",
      title: "B",
      type: "main" as const,
      meta: { tags: [] },
      padBeforeSec: 0,
      padAfterSec: 0,
      durationSec: 1.2,
      richText: "<p>B</p>",
      tts: [
        {
          id: "tts-b",
          provider: "voisona" as const,
          text: "Keep",
          readText: "Keep",
          voiceName: "voice",
          voiceVersion: "1",
          durationSec: 1.2,
          audio: { src: "/tts/project/b.wav" },
          speech: { g2p: helloG2p },
        },
      ],
    };
    readSavedProjectMock.mockResolvedValueOnce({
      meta: defaultMeta,
      bgm: [],
      voicePresets: [],
      pages: [
        {
          id: "page-a",
          title: "A",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1,
          richText: "<p>A</p>",
          tts: [
            {
              id: "tts-a",
              provider: "voisona",
              text: "Old",
              readText: "Old",
              voiceName: "voice",
              durationSec: 1,
              audio: { src: "/tts/project/a.wav" },
              speech: { g2p: helloG2p },
            },
          ],
        },
        pageB,
      ],
    });
    analyzeTextsMock.mockResolvedValueOnce([createG2pItem("New")]);
    synthesizeVoisonaMock.mockResolvedValueOnce(audio("/tts/project/a-new.wav"));
    const { saveProjectChanges } = await import("../use-case");
    const result = await saveProjectChanges({}, "project", {
      upsertItems: [
        {
          id: "page-a",
          title: "A",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          richText: "<p>A</p>",
          tts: [
            {
              id: "tts-a",
              provider: "voisona",
              text: "New",
              readText: "New",
              voiceName: "voice",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
            },
          ],
        },
      ],
      removedItemIds: [],
    });

    expect(result.updatedItemIds).toEqual(["page-a"]);
    expect(synthesizeVoisonaMock).toHaveBeenCalledTimes(1);
    expect(result.project.pages[1]).toMatchObject({ id: "page-b", tts: [{ id: "tts-b" }] });
  });

  it("does not process pages for meta or bgm-only changes", async () => {
    readSavedProjectMock.mockResolvedValueOnce({
      meta: defaultMeta,
      bgm: [],
      voicePresets: [],
      pages: [
        {
          id: "page-a",
          title: "A",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1,
          richText: "<p>A</p>",
          tts: [
            {
              id: "tts-a",
              provider: "voisona",
              text: "Hello",
              readText: "Hello",
              voiceName: "voice",
              durationSec: 1,
              audio: { src: "/tts/project/a.wav" },
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });
    const { saveProjectChanges } = await import("../use-case");
    const result = await saveProjectChanges({}, "project", {
      project: {
        meta: { ...defaultMeta, title: "renamed" },
        bgm: [
          {
            src: "/bgm/a.mp3",
            startSec: null,
            endSec: null,
            fadeIn: false,
            fadeOut: false,
            volume: 1,
          },
        ],
        voicePresets: [],
      },
      upsertItems: [],
      removedItemIds: [],
    });

    expect(result.updatedItemIds).toEqual([]);
    expect(analyzeTextsMock).not.toHaveBeenCalled();
    expect(synthesizeVoisonaMock).not.toHaveBeenCalled();
    expect(result.project.meta.title).toBe("renamed");
  });

  it("reprocesses only pages affected by a voice preset change", async () => {
    const pageA = {
      id: "page-a",
      title: "A",
      type: "main" as const,
      meta: { tags: [] },
      padBeforeSec: 0,
      padAfterSec: 0,
      durationSec: 1,
      richText: "<p>A</p>",
      tts: [
        {
          id: "tts-a",
          provider: "voisona" as const,
          text: "Hello",
          readText: "Hello",
          voiceName: "voice",
          durationSec: 1,
          audio: { src: "/tts/project/a.wav" },
          speech: { g2p: helloG2p },
        },
      ],
    };
    const pageB = {
      id: "page-b",
      title: "B",
      type: "main" as const,
      meta: { tags: [] },
      padBeforeSec: 0,
      padAfterSec: 0,
      durationSec: 1,
      richText: "<p>B</p>",
      tts: [
        {
          id: "tts-b",
          provider: "voicevox" as const,
          text: "Other",
          readText: "Other",
          voiceName: "3",
          durationSec: 1,
          audio: { src: "/tts/project/b.wav" },
          speech: { g2p: helloG2p },
        },
      ],
    };
    readSavedProjectMock.mockResolvedValueOnce({
      meta: defaultMeta,
      bgm: [],
      voicePresets: [
        {
          provider: "voisona",
          voiceName: "voice",
          synthesisSettings: { speed: 1 },
        },
      ],
      pages: [pageA, pageB],
    });
    synthesizeVoisonaMock.mockResolvedValueOnce(audio("/tts/project/a-new.wav"));
    const { saveProjectChanges } = await import("../use-case");
    const result = await saveProjectChanges({}, "project", {
      project: {
        meta: defaultMeta,
        bgm: [],
        voicePresets: [
          {
            provider: "voisona",
            voiceName: "voice",
            synthesisSettings: { speed: 1.4 },
          },
        ],
      },
      upsertItems: [],
      removedItemIds: [],
    });

    expect(result.updatedItemIds).toEqual(["page-a"]);
    expect(synthesizeVoisonaMock).toHaveBeenCalledTimes(1);
    expect(synthesizeVoicevoxMock).not.toHaveBeenCalled();
    expect(result.project.pages[1]).toMatchObject({ id: "page-b", tts: [{ id: "tts-b" }] });
  });

  it("resynthesizes all content pages when forceResynthesis is set", async () => {
    const pageA = {
      id: "page-a",
      title: "A",
      type: "main" as const,
      meta: { tags: [] },
      padBeforeSec: 0,
      padAfterSec: 0,
      durationSec: 1,
      richText: "<p>A</p>",
      tts: [
        {
          id: "tts-a",
          provider: "voisona" as const,
          text: "Hello",
          readText: "Hello",
          voiceName: "voice",
          durationSec: 1,
          audio: { src: "/tts/project/a.wav" },
          speech: { g2p: helloG2p },
        },
      ],
    };
    const pageB = {
      id: "page-b",
      title: "B",
      type: "main" as const,
      meta: { tags: [] },
      padBeforeSec: 0,
      padAfterSec: 0,
      durationSec: 1,
      richText: "<p>B</p>",
      tts: [
        {
          id: "tts-b",
          provider: "voisona" as const,
          text: "Hello",
          readText: "Hello",
          voiceName: "voice",
          durationSec: 1,
          audio: { src: "/tts/project/b.wav" },
          speech: { g2p: helloG2p },
        },
      ],
    };
    readSavedProjectMock.mockResolvedValueOnce({
      meta: defaultMeta,
      bgm: [],
      voicePresets: [],
      pages: [pageA, pageB],
    });
    synthesizeVoisonaMock
      .mockResolvedValueOnce(audio("/tts/project/a-forced.wav"))
      .mockResolvedValueOnce(audio("/tts/project/b-forced.wav"));
    const { saveProjectChanges } = await import("../use-case");
    const result = await saveProjectChanges({}, "project", {
      upsertItems: [],
      removedItemIds: [],
      forceResynthesis: true,
    });

    expect(result.updatedItemIds).toEqual(["page-a", "page-b"]);
    expect(synthesizeVoisonaMock).toHaveBeenCalledTimes(2);
    expect(result.project.pages.map((page) => page.id)).toEqual(["page-a", "page-b"]);
  });
});
