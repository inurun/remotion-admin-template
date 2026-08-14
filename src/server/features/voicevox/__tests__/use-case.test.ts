import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeVoicevoxText, listVoicevoxVoices, synthesizeVoicevox } from "../use-case";

const { accessMock, getMock, mkdirMock, postMock, wavDurationMock, writeFileMock } = vi.hoisted(
  () => ({
    accessMock: vi.fn(),
    getMock: vi.fn(),
    mkdirMock: vi.fn(),
    postMock: vi.fn(),
    wavDurationMock: vi.fn(),
    writeFileMock: vi.fn(),
  }),
);

vi.mock("node:fs/promises", () => ({
  default: {
    access: accessMock,
    mkdir: mkdirMock,
    writeFile: writeFileMock,
  },
}));

vi.mock("../client", () => ({
  getVoicevoxClient: () => ({
    GET: getMock,
    POST: postMock,
  }),
}));

vi.mock("@/server/features/voisona/wav", () => ({
  getWavDurationSeconds: wavDurationMock,
}));

describe("voicevox use cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessMock.mockRejectedValue(new Error("missing"));
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    wavDurationMock.mockResolvedValue(1.25);
  });

  it("lists talk styles as voice options", async () => {
    getMock.mockResolvedValueOnce({
      response: { ok: true },
      data: [
        {
          name: "Zundamon",
          speaker_uuid: "speaker",
          version: "1.0",
          styles: [
            { id: 3, name: "Normal", type: "talk" },
            { id: 300, name: "Sing", type: "sing" },
          ],
        },
      ],
    });

    await expect(listVoicevoxVoices({})).resolves.toEqual([
      {
        provider: "voicevox",
        voiceName: "3",
        voiceVersion: "1.0",
        displayName: "Zundamon / Normal",
      },
    ]);
    expect(getMock).toHaveBeenCalledWith("/speakers", { cache: "no-store" });
  });

  it("creates an audio query analysis string", async () => {
    postMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        accent_phrases: [],
        speedScale: 1,
        pitchScale: 0,
        intonationScale: 1,
        volumeScale: 1,
        prePhonemeLength: 0.1,
        postPhonemeLength: 0.1,
        pauseLengthScale: 1,
        outputSamplingRate: 24000,
        outputStereo: false,
      },
    });

    await expect(analyzeVoicevoxText({}, { text: "hello", voiceName: "3" })).resolves.toEqual({
      analysis:
        '{"accent_phrases":[],"intonationScale":1,"outputSamplingRate":24000,"outputStereo":false,"pauseLengthScale":1,"pitchScale":0,"postPhonemeLength":0.1,"prePhonemeLength":0.1,"speedScale":1,"volumeScale":1}',
    });
    expect(postMock).toHaveBeenCalledWith("/audio_query", {
      params: {
        query: {
          text: "hello",
          speaker: 3,
          enable_katakana_english: true,
        },
      },
    });
  });

  it("synthesizes from analysis with defaults and settings", async () => {
    postMock.mockResolvedValueOnce({
      response: { ok: true },
      data: new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" }),
    });

    await expect(
      synthesizeVoicevox({
        serverEnv: {},
        projectPath: "project",
        text: "hello",
        voiceName: "3",
        analysis:
          '{"accent_phrases":[],"speedScale":1,"pitchScale":0,"intonationScale":1,"volumeScale":1,"prePhonemeLength":0.1,"postPhonemeLength":0.1,"pauseLengthScale":1,"outputSamplingRate":24000,"outputStereo":false}',
        synthesisSettings: { speedScale: 1.3 },
      }),
    ).resolves.toMatchObject({
      audioSrc: expect.stringMatching(/^\/tts\/project\/.+\.wav$/u),
      durationSec: 1.25,
      outputPath: expect.stringMatching(/public\/tts\/project\/.+\.wav$/u),
    });
    expect(postMock).toHaveBeenCalledWith("/synthesis", {
      params: { query: { speaker: 3 } },
      body: expect.objectContaining({
        accent_phrases: [],
        speedScale: 1.3,
        outputStereo: true,
        prePhonemeLength: 0,
        postPhonemeLength: 0.1,
        pauseLengthScale: 0.5,
      }),
      parseAs: "blob",
    });
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/public\/tts\/project\/.+\.wav$/u),
      new Uint8Array([1, 2, 3]),
    );
  });

  it("reuses cached synthesis files", async () => {
    accessMock.mockResolvedValueOnce(undefined);

    await expect(
      synthesizeVoicevox({
        serverEnv: {},
        projectPath: "project",
        text: "hello",
        voiceName: "3",
        analysis: '{"accent_phrases":[]}',
      }),
    ).resolves.toMatchObject({ durationSec: 1.25 });
    expect(postMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
  });
});
