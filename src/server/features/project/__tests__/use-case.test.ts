import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";

const accessMock = vi.fn();
const readSavedProjectMock = vi.fn();
const writeSavedProjectMock = vi.fn();
const createSavedProjectMock = vi.fn();
const ensureSavedProjectFileMock = vi.fn();
const listSavedProjectsMock = vi.fn();
const parseDraftPayloadMock = vi.fn((payload: unknown) => payload);
const analyzeVoisonaTextMock = vi.fn();
const synthesizeVoisonaMock = vi.fn();
const analyzeVoicevoxTextMock = vi.fn();
const synthesizeVoicevoxMock = vi.fn();
const analyzeVoicepeakTextMock = vi.fn();
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
    parseDraftPayload: parseDraftPayloadMock,
    readSavedProject: readSavedProjectMock,
    writeSavedProject: writeSavedProjectMock,
  };
});

vi.mock("@/server/features/voisona/use-case", () => ({
  analyzeVoisonaText: analyzeVoisonaTextMock,
  synthesizeVoisona: synthesizeVoisonaMock,
}));

vi.mock("@/server/features/voicevox/use-case", () => ({
  analyzeVoicevoxText: analyzeVoicevoxTextMock,
  synthesizeVoicevox: synthesizeVoicevoxMock,
}));

vi.mock("@/server/features/voicepeak/use-case", () => ({
  analyzeVoicepeakText: analyzeVoicepeakTextMock,
  synthesizeVoicepeak: synthesizeVoicepeakMock,
}));

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
              speech: { analysis: "Hello" },
            },
          ],
        },
      ],
    };

    readSavedProjectMock.mockResolvedValueOnce(previous);
    const { saveProject } = await import("../use-case");
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
              speech: { analysis: "Hello" },
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
    expect(analyzeVoisonaTextMock).not.toHaveBeenCalled();
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
              speech: { analysis: "Hello" },
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
    const { saveProject } = await import("../use-case");
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
              speech: { analysis: "Hello" },
              avatar,
            },
          ],
        },
      ],
    });

    expect(result.pages[0]?.tts[0]).toEqual({
      ...previous.pages[0]?.tts[0],
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
      avatar,
    });
    expect(analyzeVoisonaTextMock).not.toHaveBeenCalled();
    expect(synthesizeVoisonaMock).not.toHaveBeenCalled();
  });

  it("saves a freshly synthesized project", async () => {
    readSavedProjectMock.mockResolvedValueOnce({
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 0,
          richText: "<p>Previous</p>",
          tts: [],
        },
      ],
    });
    analyzeVoisonaTextMock.mockResolvedValueOnce({ analysis: "analysis" });
    synthesizeVoisonaMock.mockResolvedValueOnce({
      audioSrc: "/tts/generated.wav",
      outputPath: "/tmp/generated.wav",
      durationSec: 2,
    });

    const { saveProject } = await import("../use-case");
    const avatar = {
      base: "normal" as const,
      eyes: "opened" as const,
      mouth: "opened" as const,
    };
    const saved = await saveProject({}, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0.5,
          padAfterSec: 0.25,
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
              avatar,
            },
          ],
        },
      ],
    });

    expect(saved.meta).toEqual({ ...defaultMeta, updatedAt: now });
    expect(saved.pages[0]?.tts[0]?.audio.src).toBe("/tts/generated.wav");
    expect(saved.pages[0]?.tts[0]?.avatar).toEqual(avatar);
    expect(saved.pages[0]?.durationSec).toBe(2.85);
    expect(writeSavedProjectMock).toHaveBeenCalledWith("project", saved);
  });

  it("saves a freshly synthesized VOICEVOX project", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeVoicevoxTextMock.mockResolvedValueOnce({ analysis: '{"accent_phrases":[]}' });
    synthesizeVoicevoxMock.mockResolvedValueOnce({
      audioSrc: "/tts/voicevox.wav",
      outputPath: "/tmp/voicevox.wav",
      durationSec: 1,
    });

    const serverEnv = {};
    const { saveProject } = await import("../use-case");
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

    expect(analyzeVoicevoxTextMock).toHaveBeenCalledWith(serverEnv, {
      text: "Hello",
      voiceName: "3",
    });
    expect(synthesizeVoicevoxMock).toHaveBeenCalledWith({
      serverEnv,
      projectPath: "project",
      text: "Hello",
      analysis: '{"accent_phrases":[]}',
      voiceName: "3",
      synthesisSettings: { speedScale: 1.3 },
    });
    expect(saved.pages[0]?.tts[0]).toMatchObject({
      provider: "voicevox",
      durationSec: 1.1,
      audio: { src: "/tts/voicevox.wav" },
      speech: { analysis: '{"accent_phrases":[]}' },
    });
  });

  it("synthesizes null tts with the project preset without baking it onto saved tts", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeVoicevoxTextMock.mockResolvedValueOnce({ analysis: '{"accent_phrases":[]}' });
    synthesizeVoicevoxMock.mockResolvedValueOnce({
      audioSrc: "/tts/voicevox.wav",
      outputPath: "/tmp/voicevox.wav",
      durationSec: 1,
    });

    const serverEnv = {};
    const voicePresets = [
      {
        provider: "voicevox" as const,
        voiceName: "3",
        synthesisSettings: { speedScale: 1.2 },
      },
    ];
    const { saveProject } = await import("../use-case");
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
      text: "Hello",
      analysis: '{"accent_phrases":[]}',
      voiceName: "3",
      synthesisSettings: { speedScale: 1.2 },
    });
    expect(saved.pages[0]?.tts[0]?.synthesisSettings).toBeUndefined();
    expect(saved.voicePresets).toEqual(voicePresets);
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
              speech: { analysis: '{"accent_phrases":[]}' },
            },
          ],
        },
      ],
    });
    synthesizeVoicevoxMock.mockResolvedValueOnce({
      audioSrc: "/tts/voicevox.wav",
      outputPath: "/tmp/voicevox.wav",
      durationSec: 1,
    });

    const serverEnv = {};
    const { saveProject } = await import("../use-case");
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
              speech: { analysis: '{"accent_phrases":[]}' },
            },
          ],
        },
      ],
    });

    expect(analyzeVoicevoxTextMock).not.toHaveBeenCalled();
    expect(synthesizeVoicevoxMock).toHaveBeenCalledWith({
      serverEnv,
      projectPath: "project",
      text: "Hello",
      analysis: '{"accent_phrases":[]}',
      voiceName: "3",
      synthesisSettings: { speedScale: 1.5 },
    });
    expect(saved.pages[0]?.tts[0]?.synthesisSettings).toBeUndefined();
    expect(saved.pages[0]?.tts[0]?.audio.src).toBe("/tts/voicevox.wav");
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
      speech: { analysis: '{"accent_phrases":[]}' },
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

    const { saveProject } = await import("../use-case");
    const saved = await saveProject({}, "project", {
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
              synthesisSettings: { speedScale: 1.3 },
              speech: { analysis: '{"accent_phrases":[]}' },
            },
          ],
        },
      ],
    });

    expect(analyzeVoicevoxTextMock).not.toHaveBeenCalled();
    expect(synthesizeVoicevoxMock).not.toHaveBeenCalled();
    expect(saved.pages[0]?.tts[0]).toMatchObject({
      audio: { src: "/tts/project/old.wav" },
      synthesisSettings: { speedScale: 1.3 },
    });
  });

  it("keeps reused audio when an override is cleared back to the current preset", async () => {
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
              synthesisSettings: { speedScale: 1.2 },
              audio: { src: "/tts/project/old.wav" },
              speech: { analysis: '{"accent_phrases":[]}' },
            },
          ],
        },
      ],
    });

    const { saveProject } = await import("../use-case");
    const saved = await saveProject({}, "project", {
      meta: defaultMeta,
      bgm: [],
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
              speech: { analysis: '{"accent_phrases":[]}' },
            },
          ],
        },
      ],
    });

    expect(synthesizeVoicevoxMock).not.toHaveBeenCalled();
    expect(saved.pages[0]?.tts[0]?.audio.src).toBe("/tts/project/old.wav");
    expect(saved.pages[0]?.tts[0]?.synthesisSettings).toBeUndefined();
  });

  it("saves a freshly synthesized VoicePeak project", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    analyzeVoicepeakTextMock.mockResolvedValueOnce({ analysis: "direct" });
    synthesizeVoicepeakMock.mockResolvedValueOnce({
      audioSrc: "/tts/voicepeak.wav",
      outputPath: "/tmp/voicepeak.wav",
      durationSec: 1.2,
    });

    const serverEnv = {};
    const { saveProject } = await import("../use-case");
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

    expect(analyzeVoicepeakTextMock).toHaveBeenCalledWith(serverEnv, {
      text: "Hello",
    });
    expect(synthesizeVoicepeakMock).toHaveBeenCalledWith({
      serverEnv,
      projectPath: "project",
      text: "Hello",
      analysis: "direct",
      voiceName: "Kasane Teto",
    });
    expect(saved.pages[0]?.tts[0]).toMatchObject({
      provider: "voicepeak",
      durationSec: 1.3,
      audio: { src: "/tts/voicepeak.wav" },
      speech: { analysis: "direct" },
    });
  });

  it("saves normalized project meta", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });

    const { saveProject } = await import("../use-case");
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
              speech: { analysis: "old analysis" },
            },
          ],
        },
      ],
    });
    analyzeVoisonaTextMock.mockResolvedValueOnce({ analysis: "new analysis" });
    synthesizeVoisonaMock.mockResolvedValueOnce({
      audioSrc: "/tts/new.wav",
      outputPath: "/tmp/new.wav",
      durationSec: 1.5,
    });

    const serverEnv = {};
    const { saveProject } = await import("../use-case");
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
              speech: { analysis: "old analysis" },
            },
          ],
        },
      ],
    });

    expect(analyzeVoisonaTextMock).toHaveBeenCalledWith(serverEnv, {
      text: "new read",
      language: "ja_JP",
    });
    expect(synthesizeVoisonaMock).toHaveBeenCalledWith({
      serverEnv,
      projectPath: "project",
      text: "new read",
      analysis: "new analysis",
      voiceName: "voice",
      voiceVersion: "1",
    });
    expect(saved.pages[0]?.tts[0]).toMatchObject({
      readText: "new read",
      durationSec: 1.6,
      audio: { src: "/tts/new.wav" },
      speech: { analysis: "new analysis" },
    });
  });

  it("reanalyzes when provider changes even if analysis remains", async () => {
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
              speech: { analysis: '{"accent_phrases":[]}' },
            },
          ],
        },
      ],
    });
    analyzeVoisonaTextMock.mockResolvedValueOnce({ analysis: "<tsml>Hello</tsml>" });
    synthesizeVoisonaMock.mockResolvedValueOnce({
      audioSrc: "/tts/new.wav",
      outputPath: "/tmp/new.wav",
      durationSec: 1.5,
    });

    const serverEnv = {};
    const { saveProject } = await import("../use-case");
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
              speech: { analysis: '{"accent_phrases":[]}' },
            },
          ],
        },
      ],
    });

    expect(analyzeVoisonaTextMock).toHaveBeenCalledWith(serverEnv, {
      text: "Hello",
      language: "ja_JP",
    });
    expect(synthesizeVoisonaMock).toHaveBeenCalledWith({
      serverEnv,
      projectPath: "project",
      text: "Hello",
      analysis: "<tsml>Hello</tsml>",
      voiceName: "voice",
      voiceVersion: "1",
    });
    expect(saved.pages[0]?.tts[0]).toMatchObject({
      provider: "voisona",
      speech: { analysis: "<tsml>Hello</tsml>" },
      audio: { src: "/tts/new.wav" },
    });
  });

  it("updates page timing fields without regenerating unchanged tts", async () => {
    const previous = {
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          type: "main",
          meta: { tags: [] },
          padBeforeSec: 0,
          padAfterSec: 0,
          durationSec: 2,
          richText: "<p>Hello</p>",
          tts: [
            {
              id: "tts-1",
              provider: "voisona",
              text: "Hello",
              readText: "Hello",
              voiceName: "voice",
              voiceVersion: "1",
              durationSec: 2,
              audio: { src: "/tts/project/old.wav" },
              speech: { analysis: "Hello" },
            },
          ],
        },
      ],
    };

    readSavedProjectMock.mockResolvedValueOnce(previous);
    const { saveProject } = await import("../use-case");
    const result = await saveProject({}, "project", {
      meta: defaultMeta,
      bgm: [],
      pages: [
        {
          id: "page-1",
          title: "Renamed",
          type: "intro",
          meta: { tags: ["updated"] },
          padBeforeSec: 1,
          padAfterSec: 0.5,
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
              speech: { analysis: "Hello" },
            },
          ],
        },
      ],
    });

    expect(result.pages[0]).toMatchObject({
      title: "Renamed",
      type: "intro",
      meta: { tags: ["updated"] },
      padBeforeSec: 1,
      padAfterSec: 0.5,
      durationSec: 3.5,
    });
    expect(result.pages[0]?.tts[0]).toEqual({
      ...previous.pages[0]?.tts[0],
      padBeforeSec: 0,
      padAfterSec: 0,
      volume: 1,
    });
    expect(analyzeVoisonaTextMock).not.toHaveBeenCalled();
    expect(synthesizeVoisonaMock).not.toHaveBeenCalled();
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
              speech: { analysis: "Hello" },
            },
          ],
        },
      ],
    });
    synthesizeVoisonaMock.mockResolvedValueOnce({
      audioSrc: "/tts/project/new.wav",
      outputPath: "/tmp/new.wav",
      durationSec: 1.5,
    });

    const serverEnv = {};
    const { saveProject } = await import("../use-case");
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
              speech: { analysis: "Hello" },
            },
          ],
        },
      ],
    });

    expect(analyzeVoisonaTextMock).not.toHaveBeenCalled();
    expect(synthesizeVoisonaMock).toHaveBeenCalledWith({
      serverEnv,
      projectPath: "project",
      text: "Hello",
      analysis: "Hello",
      voiceName: "voice",
      voiceVersion: "1",
    });
    expect(saved.pages[0]?.tts[0]?.audio.src).toBe("/tts/project/new.wav");
  });

  it("resynthesizes when previous audio src is not project-scoped", async () => {
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
              audio: { src: "/tts/old.wav" },
              speech: { analysis: "Hello" },
            },
          ],
        },
      ],
    });
    synthesizeVoisonaMock.mockResolvedValueOnce({
      audioSrc: "/tts/project/new.wav",
      outputPath: "/tmp/new.wav",
      durationSec: 1.5,
    });

    const serverEnv = {};
    const { saveProject } = await import("../use-case");
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
              speech: { analysis: "Hello" },
            },
          ],
        },
      ],
    });

    expect(synthesizeVoisonaMock).toHaveBeenCalled();
  });

  it("rejects when a page is shorter than an adjacent transition", async () => {
    readSavedProjectMock.mockResolvedValueOnce({ pages: [] });
    synthesizeVoisonaMock
      .mockResolvedValueOnce({
        audioSrc: "/tts/short.wav",
        outputPath: "/tmp/short.wav",
        durationSec: 0.2,
      })
      .mockResolvedValueOnce({
        audioSrc: "/tts/long.wav",
        outputPath: "/tmp/long.wav",
        durationSec: 3,
      });
    analyzeVoisonaTextMock.mockResolvedValue({ analysis: "<tsml />" });

    const { saveProject } = await import("../use-case");
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
                speech: { analysis: "<tsml />" },
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
                speech: { analysis: "<tsml />" },
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
    expect(readSavedProjectMock).toHaveBeenCalledWith("source");
    expect(createSavedProjectMock).toHaveBeenCalledWith("copy", {
      ...project,
      meta: { ...defaultMeta, updatedAt: now },
    });
  });
});
