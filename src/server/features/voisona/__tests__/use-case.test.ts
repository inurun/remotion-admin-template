import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeVoisonaText, listVoisonaVoices, synthesizeVoisona } from "../use-case";

const { accessMock, getMock, mkdirMock, postMock, waitForVoisonaRequestMock, wavDurationMock } =
  vi.hoisted(() => ({
    accessMock: vi.fn(),
    getMock: vi.fn(),
    mkdirMock: vi.fn(),
    postMock: vi.fn(),
    waitForVoisonaRequestMock: vi.fn(),
    wavDurationMock: vi.fn(),
  }));

vi.mock("node:fs/promises", () => ({
  default: {
    access: accessMock,
    mkdir: mkdirMock,
  },
}));

vi.mock("../client", () => ({
  getVoisonaClient: () => ({
    GET: getMock,
    POST: postMock,
  }),
  waitForVoisonaRequest: waitForVoisonaRequestMock,
}));

vi.mock("../wav", () => ({
  getWavDurationSeconds: wavDurationMock,
}));

describe("voisona use cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessMock.mockRejectedValue(new Error("missing"));
    mkdirMock.mockResolvedValue(undefined);
    wavDurationMock.mockResolvedValue(1.5);
  });

  it("lists voices from the OpenAPI /voices endpoint", async () => {
    getMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        items: [
          {
            voice_name: "zundamon_ja_JP",
            voice_version: "1.0.0",
            display_name: "Zundamon",
          },
        ],
      },
    });

    await expect(listVoisonaVoices({})).resolves.toEqual([
      {
        provider: "voisona",
        voiceName: "zundamon_ja_JP",
        voiceVersion: "1.0.0",
        displayName: "Zundamon",
      },
    ]);
    expect(getMock).toHaveBeenCalledWith("/voices", { cache: "no-store" });
  });

  it("requests text analysis through the generated client", async () => {
    postMock.mockResolvedValueOnce({
      response: { ok: true },
      data: { uuid: "analysis-id" },
    });
    waitForVoisonaRequestMock.mockResolvedValueOnce({
      state: "succeeded",
      analyzed_text: "<tsml>hello</tsml>",
    });

    await expect(analyzeVoisonaText({}, { text: "hello" })).resolves.toEqual({
      analysis: "<tsml>hello</tsml>",
    });
    expect(postMock).toHaveBeenCalledWith("/text-analyses", {
      body: {
        language: "ja_JP",
        text: "hello",
        force_enqueue: true,
      },
    });
    expect(waitForVoisonaRequestMock).toHaveBeenCalledWith({}, "text-analyses", "analysis-id");
  });

  it("requests speech synthesis through the generated client", async () => {
    postMock.mockResolvedValueOnce({
      response: { ok: true },
      data: { uuid: "synthesis-id" },
    });
    waitForVoisonaRequestMock.mockResolvedValueOnce({ state: "succeeded" });

    await expect(
      synthesizeVoisona({
        serverEnv: {},
        projectPath: "project",
        text: "hello",
        analysis: "<tsml>hello</tsml>",
        voiceName: "zundamon_ja_JP",
        voiceVersion: "1.0.0",
        synthesisSettings: { speed: 1.2 },
      }),
    ).resolves.toMatchObject({
      audioSrc: expect.stringMatching(/^\/tts\/project\/.+\.wav$/u),
      durationSec: 1.5,
      outputPath: expect.stringMatching(/public\/tts\/project\/.+\.wav$/u),
    });
    expect(postMock).toHaveBeenCalledWith("/speech-syntheses", {
      body: expect.objectContaining({
        language: "ja_JP",
        analyzed_text: "<tsml>hello</tsml>",
        destination: "file",
        can_overwrite_file: true,
        voice_name: "zundamon_ja_JP",
        voice_version: "1.0.0",
        global_parameters: { speed: 1.2 },
        force_enqueue: true,
      }),
    });
    expect(waitForVoisonaRequestMock).toHaveBeenCalledWith({}, "speech-syntheses", "synthesis-id");
  });

  it("throws when synthesis request fails", async () => {
    postMock.mockResolvedValueOnce({
      response: { ok: false },
      error: { detail: "bad request" },
    });

    await expect(
      synthesizeVoisona({
        serverEnv: {},
        projectPath: "project",
        text: "hello",
        voiceName: "zundamon_ja_JP",
      }),
    ).rejects.toThrow("VoiSona synthesis request failed");
  });
});
