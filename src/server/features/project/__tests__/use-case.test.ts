import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";
import { EYECATCH_TEXT_MIN_DURATION_SEC } from "@/_shared/lib/page/page-timing";
import { isSavedContentPage, type SavedPage, type SavedSequenceItem } from "@/_schemas";
import type { SaveSequenceItem } from "@/server/features/project/contract";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { HaqumeiApiError } from "@/server/features/haqumei-api/error";

const accessMock = vi.fn();
const mkdirMock = vi.fn();
const writeFileMock = vi.fn();
const readSavedProjectMock = vi.fn();
const writeSavedProjectMock = vi.fn();
const createSavedProjectMock = vi.fn();
const ensureSavedProjectFileMock = vi.fn();
const listSavedProjectsMock = vi.fn();
const analyzeTextsMock = vi.fn();
const synthesizeVoisonaMock = vi.fn();
const synthesizeVoicevoxMock = vi.fn();
const synthesizeVoicepeakMock = vi.fn();
const planVoisonaSynthesisMock = vi.fn();
const planVoicevoxSynthesisMock = vi.fn();
const planVoicepeakSynthesisMock = vi.fn();
const readCachedWavMock = vi.fn();
const requestOpenRouterCorrectionsMock = vi.fn();
const validateG2pItemsMock = vi.fn();

vi.mock("node:fs/promises", () => ({
  default: {
    access: (...args: unknown[]) => accessMock(...args),
    mkdir: (...args: unknown[]) => mkdirMock(...args),
    writeFile: (...args: unknown[]) => writeFileMock(...args),
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
  planVoisonaSynthesis: planVoisonaSynthesisMock,
  planVoicevoxSynthesis: planVoicevoxSynthesisMock,
  synthesizeVoisona: synthesizeVoisonaMock,
  synthesizeVoicevox: synthesizeVoicevoxMock,
}));

vi.mock("@/server/features/voicepeak/use-case", () => ({
  planVoicepeakSynthesis: planVoicepeakSynthesisMock,
  synthesizeVoicepeak: synthesizeVoicepeakMock,
}));

vi.mock("@/server/features/tts/wav-cache", async () => {
  const actual = await vi.importActual<typeof import("@/server/features/tts/wav-cache")>(
    "@/server/features/tts/wav-cache",
  );
  return {
    ...actual,
    readCachedWav: (...args: unknown[]) => readCachedWavMock(...args),
  };
});

vi.mock("@/server/features/tts/openrouter", async () => {
  const actual = await vi.importActual<typeof import("@/server/features/tts/openrouter")>(
    "@/server/features/tts/openrouter",
  );
  return {
    ...actual,
    requestOpenRouterCorrections: (...args: unknown[]) => requestOpenRouterCorrectionsMock(...args),
  };
});

vi.mock("@/server/features/haqumei-api/validate", () => ({
  validateG2pItems: (...args: unknown[]) => validateG2pItemsMock(...args),
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

function mockPlannedSynthesis(
  mock: { mockImplementation: (impl: (input: { projectPath: string }) => unknown) => unknown },
  synthesizeMock: (input: unknown) => Promise<{ durationSec: number }>,
  provider: string,
) {
  let sequence = 0;
  mock.mockImplementation((input: { projectPath: string }) => {
    sequence += 1;
    const audioSrc = `/tts/${input.projectPath}/${provider}-${sequence}.wav`;
    return {
      wav: {
        fileName: `${provider}-${sequence}.wav`,
        outputPath: `/tmp/${provider}-${sequence}.wav`,
        audioSrc,
      },
      run: async () => {
        const result = await synthesizeMock(input);
        return {
          audioSrc,
          outputPath: `/tmp/${provider}-${sequence}.wav`,
          durationSec: result.durationSec,
        };
      },
    };
  });
}

function lastWrittenProject() {
  const last = writeSavedProjectMock.mock.calls.at(-1);
  if (!last) {
    throw new Error("expected project write");
  }
  return last[1] as import("@/_schemas").SavedProject;
}

async function flushJobs() {
  const { flushAnalysisJobsForTests } = await import("../tts-analysis-jobs");
  const { flushSynthesisJobsForTests } = await import("../tts-synthesis-jobs");
  await flushAnalysisJobsForTests();
  await flushSynthesisJobsForTests();
}

describe("project use-case", () => {
  const now = "2026-07-27T09:40:00.000Z";
  const defaultMeta = {
    title: "project",
    description: "",
    width: 1920,
    height: 1080,
    weather: {},
    niconico: {
      title: "",
      description: "",
      thumbnailTime: "00:00.000",
      parentWorkIds: [],
      tags: [],
    },
  };
  const helloG2p = createG2pItem("Hello");

  beforeEach(async () => {
    vi.clearAllMocks();
    accessMock.mockResolvedValue(undefined);
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    readCachedWavMock.mockResolvedValue(null);
    readSavedProjectMock.mockImplementation(async () => {
      const last = writeSavedProjectMock.mock.calls.at(-1);
      return last?.[1] ?? { pages: [] };
    });
    mockPlannedSynthesis(planVoisonaSynthesisMock, synthesizeVoisonaMock, "voisona");
    mockPlannedSynthesis(planVoicevoxSynthesisMock, synthesizeVoicevoxMock, "voicevox");
    mockPlannedSynthesis(planVoicepeakSynthesisMock, synthesizeVoicepeakMock, "voicepeak");
    const { resetSynthesisJobsForTests } = await import("../tts-synthesis-jobs");
    const { resetAnalysisJobsForTests } = await import("../tts-analysis-jobs");
    const { resetProjectMutationQueueForTests } = await import("../project-mutation-queue");
    const { resetMissingOpenRouterApiKeyWarningForTests } =
      await import("@/server/features/tts/llm-g2p-profile");
    resetSynthesisJobsForTests();
    resetAnalysisJobsForTests();
    resetProjectMutationQueueForTests();
    resetMissingOpenRouterApiKeyWarningForTests();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(async () => {
    await flushJobs();
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
              audio: { status: "ready", src: "/tts/nested/example/old.wav", durationSec: 1.2 },
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

  it("returns pending audio before synthesis settles", async () => {
    let resolveSynth: ((value: ReturnType<typeof audio>) => void) | undefined;
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeTextsMock.mockResolvedValueOnce([helloG2p]);
    synthesizeVoisonaMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSynth = resolve;
      }),
    );

    const savedPromise = saveProject({}, "project", {
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

    const saved = await savedPromise;
    expect(contentPage(saved.pages).tts[0]?.audio).toMatchObject({
      status: "pending",
    });
    expect(contentPage(saved.pages).tts[0]?.speech.g2p).toEqual(helloG2p);
    expect(writeSavedProjectMock).toHaveBeenCalledTimes(1);

    resolveSynth?.(audio("/tts/project/voisona-1.wav", 2));
    await flushJobs();
    expect(writeSavedProjectMock).toHaveBeenCalledTimes(2);
    expect(contentPage(lastWrittenProject().pages).tts[0]?.audio).toMatchObject({
      status: "ready",
      durationSec: 2.1,
    });
  });

  it("marks cached wav ready without calling the engine", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeTextsMock.mockResolvedValueOnce([helloG2p]);
    readCachedWavMock.mockResolvedValueOnce(audio("/tts/project/cached.wav", 2));

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
          richText: "<p>Hello</p>",
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

    expect(contentPage(saved.pages).tts[0]?.audio).toMatchObject({
      status: "ready",
      durationSec: 2.1,
    });
    expect(synthesizeVoisonaMock).not.toHaveBeenCalled();
    expect(writeSavedProjectMock).toHaveBeenCalledTimes(1);
  });

  it("saves failed audio without failing the rest of the batch", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeTextsMock.mockResolvedValueOnce([helloG2p, createG2pItem("World")]);
    synthesizeVoisonaMock
      .mockRejectedValueOnce(new Error("engine exploded"))
      .mockResolvedValueOnce(audio("/tts/two.wav", 1));

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
              provider: "voisona",
              text: "Hello",
              voiceName: "voice",
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

    expect(contentPage(saved.pages).tts.map((item) => item.audio.status)).toEqual([
      "pending",
      "pending",
    ]);
    await flushJobs();
    expect(contentPage(lastWrittenProject().pages).tts.map((item) => item.audio)).toMatchObject([
      { status: "failed", error: "engine exploded" },
      { status: "ready", durationSec: 1.1 },
    ]);
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
              audio: { status: "ready", src: "/tts/project/old.wav", durationSec: 1.2 },
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
    const second = createG2pItem("Hello", "ヘ'ロ");
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
      audio: { status: "pending" },
      speech: { g2p: helloG2p },
    });
    await flushJobs();
    expect(contentPage(lastWrittenProject().pages).tts[0]).toMatchObject({
      provider: "voicevox",
      audio: { status: "ready", durationSec: 1.1 },
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
    const edited = createG2pItem("Hello", "ヘ'ロ");
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
              audio: { status: "ready", src: "/tts/project/old.wav", durationSec: 1.1 },
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
              audio: { status: "ready", src: "/tts/project/old.wav", durationSec: 1.1 },
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
    expect(contentPage(saved.pages).tts[0]?.audio.status).toBe("pending");
    await flushJobs();
    expect(contentPage(lastWrittenProject().pages).tts[0]?.audio.status).toBe("ready");
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
      audio: { status: "ready", src: "/tts/project/old.wav", durationSec: 1.1 },
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
    expect(contentPage(saved.pages).tts[0]?.audio).toMatchObject({
      status: "ready",
      src: "/tts/project/old.wav",
    });
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
      audio: { status: "pending" },
      speech: {},
    });
    await flushJobs();
    expect(contentPage(lastWrittenProject().pages).tts[0]).toMatchObject({
      provider: "voicepeak",
      audio: { status: "ready", durationSec: 1.3 },
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
        niconico: {
          title: "",
          description: "",
          thumbnailTime: "00:00.000",
          parentWorkIds: [],
          tags: [],
        },
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
              audio: { status: "ready", src: "/tts/old.wav", durationSec: 1.2 },
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
              audio: { status: "ready", src: "/tts/old.wav", durationSec: 1.2 },
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
              audio: { status: "ready", src: "/tts/project/old.wav", durationSec: 1.2 },
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

  it("keeps pending pages saveable when shorter than an adjacent transition", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    synthesizeVoisonaMock
      .mockResolvedValueOnce(audio("/tts/short.wav", 0.2))
      .mockResolvedValueOnce(audio("/tts/long.wav", 3));

    const saved = await saveProject({}, "project", {
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
    });

    expect(contentPage(saved.pages).durationSec).toBe(0.8);
    await flushJobs();
    expect(contentPage(lastWrittenProject().pages).durationSec).toBe(0.8);
  });

  it("keeps a failed page saveable when shorter than an adjacent transition", async () => {
    const previous = {
      pages: [
        {
          id: "page-short",
          title: "Short",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 0.2,
          richText: null,
          tts: [
            {
              id: "tts-short",
              provider: "voisona",
              text: "short",
              readText: "short",
              voiceName: "voice",
              audio: { status: "failed", src: "/tts/project/short.wav", error: "engine failed" },
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
          durationSec: 3,
          richText: null,
          tts: [
            {
              id: "tts-long",
              provider: "voisona",
              text: "long",
              readText: "long",
              voiceName: "voice",
              audio: { status: "ready", src: "/tts/project/long.wav", durationSec: 3 },
              speech: { g2p: createG2pItem("long") },
            },
          ],
        },
      ],
    };
    readSavedProjectMock.mockResolvedValueOnce(previous);

    const saved = await saveProject({}, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: previous.pages.map((page) => {
        if (page.type === "transition") {
          return page;
        }
        return {
          id: page.id,
          title: page.title,
          type: page.type,
          meta: page.meta,
          padBeforeSec: page.padBeforeSec,
          padAfterSec: page.padAfterSec,
          richText: page.richText,
          tts: (("tts" in page ? page.tts : []) ?? []).map((item) => ({
            id: item.id,
            provider: item.provider,
            text: item.text,
            voiceName: item.voiceName,
            speech: item.speech,
          })),
        };
      }),
    });

    expect(contentPage(saved.pages).durationSec).toBe(0.8);
    expect(contentPage(saved.pages).tts[0]?.audio).toMatchObject({
      status: "failed",
      error: "engine failed",
    });
    expect(writeSavedProjectMock).toHaveBeenCalled();
  });

  it("rejects a ready page shorter than an adjacent transition", async () => {
    const previous = {
      pages: [
        {
          id: "page-short",
          title: "Short",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 0.2,
          richText: null,
          tts: [
            {
              id: "tts-short",
              provider: "voisona",
              text: "short",
              readText: "short",
              voiceName: "voice",
              audio: { status: "ready", src: "/tts/project/short.wav", durationSec: 0.2 },
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
          durationSec: 3,
          richText: null,
          tts: [
            {
              id: "tts-long",
              provider: "voisona",
              text: "long",
              readText: "long",
              voiceName: "voice",
              audio: { status: "ready", src: "/tts/project/long.wav", durationSec: 3 },
              speech: { g2p: createG2pItem("long") },
            },
          ],
        },
      ],
    };
    readSavedProjectMock.mockResolvedValueOnce(previous);

    await expect(
      saveProject({}, "project", {
        meta: defaultMeta,
        bgm: [],
        pages: previous.pages.map((page) => {
          if (page.type === "transition") {
            return page;
          }
          return {
            id: page.id,
            title: page.title,
            type: page.type,
            meta: page.meta,
            padBeforeSec: page.padBeforeSec,
            padAfterSec: page.padAfterSec,
            richText: page.richText,
            tts: (("tts" in page ? page.tts : []) ?? []).map((item) => ({
              id: item.id,
              provider: item.provider,
              text: item.text,
              voiceName: item.voiceName,
              speech: item.speech,
            })),
          };
        }),
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
        niconico: {
          title: "",
          description: "",
          thumbnailTime: "00:00.000",
          parentWorkIds: [],
          tags: [],
        },
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
      durationSec: EYECATCH_TEXT_MIN_DURATION_SEC,
    });
    await flushJobs();
    expect(contentPage(lastWrittenProject().pages)).toMatchObject({
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
          audio: { status: "ready", src: "/tts/project/b.wav", durationSec: 1.2 },
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
              audio: { status: "ready", src: "/tts/project/a.wav", durationSec: 1 },
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
              audio: { status: "ready", src: "/tts/project/a.wav", durationSec: 1 },
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
          audio: { status: "ready", src: "/tts/project/a.wav", durationSec: 1 },
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
          audio: { status: "ready", src: "/tts/project/b.wav", durationSec: 1 },
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
          audio: { status: "ready", src: "/tts/project/a.wav", durationSec: 1 },
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
          audio: { status: "ready", src: "/tts/project/b.wav", durationSec: 1 },
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

  it("writes analyzing audio before Gemma finishes when an API key is set", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeTextsMock.mockResolvedValueOnce([helloG2p]);
    let resolveLlm: ((value: unknown) => void) | undefined;
    requestOpenRouterCorrectionsMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLlm = resolve;
      }),
    );
    validateG2pItemsMock.mockResolvedValueOnce([helloG2p]);
    synthesizeVoisonaMock.mockResolvedValueOnce(audio("/tts/project/voisona-1.wav", 2));

    const saved = await saveProject({ OPENROUTER_API_KEY: "secret" }, "project", {
      meta: defaultMeta,
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

    expect(contentPage(saved.pages).tts[0]?.audio.status).toBe("analyzing");
    expect(contentPage(saved.pages).tts[0]?.speech.g2p).toEqual(helloG2p);
    expect(writeSavedProjectMock).toHaveBeenCalledTimes(1);
    expect(synthesizeVoisonaMock).not.toHaveBeenCalled();
    expect(requestOpenRouterCorrectionsMock).toHaveBeenCalledTimes(1);
    expect(requestOpenRouterCorrectionsMock.mock.calls[0]?.[2]).toMatchObject({
      profile: expect.objectContaining({ id: "gemini-3.8-flash" }),
    });

    resolveLlm?.({
      requestId: "generation-1",
      model: "google/gemma-4-31b-it",
      actualProvider: "coreweave",
      reasoningEffort: "none",
      structuredOutput: [{ id: "tts-1", changed: false, kana: "", reason: "維持" }],
      renderedKana: [helloG2p.kana],
      corrections: [{ id: "tts-1", changed: false, kana: helloG2p.kana, reason: "維持" }],
      usage: {
        promptTokens: 1,
        completionTokens: 1,
        reasoningTokens: 0,
        cachedTokens: 0,
        totalTokens: 2,
        costUsd: 0,
      },
    });
    await flushJobs();
    expect(contentPage(lastWrittenProject().pages).tts[0]?.audio).toMatchObject({
      status: "ready",
      durationSec: 2.1,
    });
  });

  it("applies the project voice preset when synthesizing after automatic G2P", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeTextsMock.mockResolvedValueOnce([helloG2p]);
    requestOpenRouterCorrectionsMock.mockResolvedValueOnce({
      requestId: "generation-1",
      model: "google/gemma-4-31b-it",
      actualProvider: "coreweave",
      reasoningEffort: "none",
      structuredOutput: [{ id: "tts-1", changed: false, kana: "", reason: "維持" }],
      renderedKana: [helloG2p.kana],
      corrections: [{ id: "tts-1", changed: false, kana: helloG2p.kana, reason: "維持" }],
      usage: {
        promptTokens: 1,
        completionTokens: 1,
        reasoningTokens: 0,
        cachedTokens: 0,
        totalTokens: 2,
        costUsd: 0,
      },
    });
    synthesizeVoicevoxMock.mockResolvedValueOnce(audio("/tts/project/voicevox-1.wav", 1));

    const saved = await saveProject({ OPENROUTER_API_KEY: "secret" }, "project", {
      meta: defaultMeta,
      voicePresets: getDefaultVoicePresets(),
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

    expect(contentPage(saved.pages).tts[0]?.audio.status).toBe("analyzing");
    expect(contentPage(saved.pages).tts[0]?.synthesisSettings).toBeUndefined();
    await flushJobs();
    expect(synthesizeVoicevoxMock).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceName: "3",
        synthesisSettings: expect.objectContaining({
          speedScale: 1.4,
          pitchScale: -0.01,
          intonationScale: 0.9,
          pauseLengthScale: 0.5,
        }),
      }),
    );
    expect(contentPage(lastWrittenProject().pages).tts[0]?.synthesisSettings).toBeUndefined();
  });

  it("reuses analyzing after baseline G2P is reconciled onto the form", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeTextsMock.mockResolvedValueOnce([helloG2p]);
    let rejectLlm: ((error: Error) => void) | undefined;
    requestOpenRouterCorrectionsMock.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectLlm = reject;
      }),
    );

    const first = await saveProject({ OPENROUTER_API_KEY: "secret" }, "project", {
      meta: defaultMeta,
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
    const firstAudio = contentPage(first.pages).tts[0]?.audio;
    const analysisKey = firstAudio?.status === "analyzing" ? firstAudio.analysisKey : undefined;

    const second = await saveProject({ OPENROUTER_API_KEY: "secret" }, "project", {
      meta: defaultMeta,
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
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });

    expect(contentPage(second.pages).tts[0]?.audio).toEqual({
      status: "analyzing",
      analysisKey,
    });
    expect(requestOpenRouterCorrectionsMock).toHaveBeenCalledTimes(1);
    expect(analyzeTextsMock).toHaveBeenCalledTimes(1);
    synthesizeVoisonaMock.mockResolvedValue(audio("/tts/project/voisona-1.wav"));
    rejectLlm?.(new Error("stop"));
    await flushJobs();
  });

  it("keeps analyzing when only the voice changes", async () => {
    const analysisKey = "keep-me";
    readSavedProjectMock.mockResolvedValueOnce({
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "Hello",
              voiceName: "old-voice",
              audio: { status: "analyzing", analysisKey },
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });

    const saved = await saveProject({ OPENROUTER_API_KEY: "secret" }, "project", {
      meta: defaultMeta,
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
              voiceName: "new-voice",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });

    expect(contentPage(saved.pages).tts[0]).toMatchObject({
      voiceName: "new-voice",
      audio: { status: "analyzing", analysisKey },
      speech: { g2p: helloG2p },
    });
    expect(requestOpenRouterCorrectionsMock).not.toHaveBeenCalled();
  });

  it("ends analyzing when the provider changes to VoicePeak", async () => {
    readSavedProjectMock.mockResolvedValueOnce({
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "Hello",
              voiceName: "voice",
              audio: { status: "analyzing", analysisKey: "old-key" },
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });
    synthesizeVoicepeakMock.mockResolvedValueOnce(audio("/tts/project/voicepeak-1.wav", 1));

    const saved = await saveProject({ OPENROUTER_API_KEY: "secret" }, "project", {
      meta: defaultMeta,
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
              readText: "Hello",
              voiceName: "voice",
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });

    expect(contentPage(saved.pages).tts[0]?.audio.status).toBe("pending");
    expect(contentPage(saved.pages).tts[0]?.provider).toBe("voicepeak");
    expect(requestOpenRouterCorrectionsMock).not.toHaveBeenCalled();
    await flushJobs();
  });

  it("skips automatic analyze when usable G2P is already present", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    synthesizeVoisonaMock.mockResolvedValueOnce(audio("/tts/project/voisona-1.wav"));

    const saved = await saveProject({ OPENROUTER_API_KEY: "secret" }, "project", {
      meta: defaultMeta,
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
              padBeforeSec: 0,
              padAfterSec: 0,
              volume: 1,
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });

    expect(contentPage(saved.pages).tts[0]?.audio.status).toBe("pending");
    expect(analyzeTextsMock).not.toHaveBeenCalled();
    expect(requestOpenRouterCorrectionsMock).not.toHaveBeenCalled();
    await flushJobs();
  });

  it("does not create analyzing when the OpenRouter API key is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeTextsMock.mockResolvedValueOnce([helloG2p]);
    synthesizeVoisonaMock.mockResolvedValueOnce(audio("/tts/project/voisona-1.wav"));

    const saved = await saveProject({}, "project", {
      meta: defaultMeta,
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

    expect(contentPage(saved.pages).tts[0]?.audio.status).toBe("pending");
    expect(requestOpenRouterCorrectionsMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "[llm-g2p] OPENROUTER_API_KEY is not set; automatic G2P correction is skipped",
    );
    warn.mockRestore();
    await flushJobs();
  });

  it("re-registers stuck analyzing jobs on force resynthesis", async () => {
    const analysisKey = "stuck-key";
    readSavedProjectMock.mockResolvedValueOnce({
      meta: defaultMeta,
      bgm: [],
      voicePresets: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 1,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "Hello",
              voiceName: "voice",
              audio: { status: "analyzing", analysisKey },
              speech: { g2p: helloG2p },
            },
          ],
        },
      ],
    });
    requestOpenRouterCorrectionsMock.mockResolvedValueOnce({
      requestId: "generation-1",
      model: "google/gemma-4-31b-it",
      actualProvider: "coreweave",
      reasoningEffort: "none",
      structuredOutput: [{ id: "tts-1", changed: false, kana: "", reason: "維持" }],
      renderedKana: [helloG2p.kana],
      corrections: [{ id: "tts-1", changed: false, kana: helloG2p.kana, reason: "維持" }],
      usage: {
        promptTokens: 1,
        completionTokens: 1,
        reasoningTokens: 0,
        cachedTokens: 0,
        totalTokens: 2,
        costUsd: 0,
      },
    });
    validateG2pItemsMock.mockResolvedValueOnce([helloG2p]);
    synthesizeVoisonaMock.mockResolvedValueOnce(audio("/tts/project/voisona-1.wav", 2));

    const { saveProjectChanges } = await import("../use-case");
    const result = await saveProjectChanges({ OPENROUTER_API_KEY: "secret" }, "project", {
      upsertItems: [],
      removedItemIds: [],
      forceResynthesis: true,
    });

    expect(contentPage(result.project.pages).tts[0]?.audio).toEqual({
      status: "analyzing",
      analysisKey,
    });
    expect(requestOpenRouterCorrectionsMock).toHaveBeenCalledTimes(1);
    await flushJobs();
    expect(contentPage(lastWrittenProject().pages).tts[0]?.audio.status).toBe("ready");
  });
});
