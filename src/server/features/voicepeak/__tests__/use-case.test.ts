import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeVoicepeakText, listVoicepeakVoices, synthesizeVoicepeak } from "../use-case";

const {
  accessMock,
  listNarratorsMock,
  mkdirMock,
  runVoicepeakSynthesisMock,
  unlinkMock,
  wavDurationMock,
} = vi.hoisted(() => ({
  accessMock: vi.fn(),
  listNarratorsMock: vi.fn(),
  mkdirMock: vi.fn(),
  runVoicepeakSynthesisMock: vi.fn(),
  unlinkMock: vi.fn(),
  wavDurationMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    access: accessMock,
    mkdir: mkdirMock,
    unlink: unlinkMock,
  },
}));

vi.mock("../cli", () => ({
  getVoicepeakPath: (serverEnv: { VOICEPEAK_PATH?: string }) =>
    serverEnv.VOICEPEAK_PATH?.trim() || "/Applications/voicepeak.app/Contents/MacOS/voicepeak",
  listNarrators: listNarratorsMock,
  runVoicepeakSynthesis: runVoicepeakSynthesisMock,
}));

vi.mock("@/server/features/voisona/wav", () => ({
  getWavDurationSeconds: wavDurationMock,
}));

describe("voicepeak use cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessMock.mockRejectedValue(new Error("missing"));
    mkdirMock.mockResolvedValue(undefined);
    unlinkMock.mockResolvedValue(undefined);
    wavDurationMock.mockResolvedValue(1.5);
    runVoicepeakSynthesisMock.mockResolvedValue(undefined);
  });

  it("lists narrators as voice options", async () => {
    listNarratorsMock.mockResolvedValueOnce(["Kasane Teto"]);

    await expect(listVoicepeakVoices({})).resolves.toEqual([
      {
        provider: "voicepeak",
        voiceName: "Kasane Teto",
        displayName: "Kasane Teto",
      },
    ]);
    expect(listNarratorsMock).toHaveBeenCalledWith({});
  });

  it("returns direct analysis", async () => {
    await expect(analyzeVoicepeakText({}, { text: "hello" })).resolves.toEqual({
      analysis: "direct",
    });
  });

  it("synthesizes with default Kasane Teto emotion", async () => {
    await expect(
      synthesizeVoicepeak({
        serverEnv: {},
        projectPath: "project",
        text: "hello",
        voiceName: "Kasane Teto",
      }),
    ).resolves.toMatchObject({
      audioSrc: expect.stringMatching(/^\/tts\/project\/.+\.wav$/u),
      durationSec: 1.5,
      outputPath: expect.stringMatching(/public\/tts\/project\/.+\.wav$/u),
    });

    expect(runVoicepeakSynthesisMock).toHaveBeenCalledWith(
      {},
      {
        text: "hello",
        narrator: "Kasane Teto",
        outputPath: expect.stringMatching(/public\/tts\/project\/.+\.wav$/u),
        emotion: {
          "teto-overactive": 10,
          "teto-low-key": 20,
          "teto-whisper": 20,
          "teto-powerful": 10,
          "teto-sweet": 30,
        },
        speed: 90,
        pitch: 0,
      },
    );
  });

  it("reuses cached synthesis files", async () => {
    accessMock.mockResolvedValueOnce(undefined);

    await expect(
      synthesizeVoicepeak({
        serverEnv: {},
        projectPath: "project",
        text: "hello",
        voiceName: "Kasane Teto",
      }),
    ).resolves.toMatchObject({ durationSec: 1.5 });
    expect(runVoicepeakSynthesisMock).not.toHaveBeenCalled();
  });

  it("passes custom speed pitch and emotion", async () => {
    const serverEnv = { VOICEPEAK_PATH: "/custom/voicepeak" };
    await synthesizeVoicepeak({
      serverEnv,
      projectPath: "project",
      text: "custom",
      voiceName: "Kasane Teto",
      synthesisSettings: {
        speed: 100,
        pitch: 10,
        emotion: { "teto-sweet": 50 },
      },
    });

    expect(runVoicepeakSynthesisMock).toHaveBeenCalledWith(serverEnv, {
      text: "custom",
      narrator: "Kasane Teto",
      outputPath: expect.stringMatching(/public\/tts\/project\/.+\.wav$/u),
      emotion: { "teto-sweet": 50 },
      speed: 100,
      pitch: 10,
    });
  });
});
