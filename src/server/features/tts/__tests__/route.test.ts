import { describe, expect, it, vi } from "vitest";
import { ttsApp } from "../route";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { HaqumeiApiError } from "@/server/features/haqumei-api/error";

const {
  analyzeTtsMock,
  analyzeTtsPageWithLlmMock,
  clearTtsCacheMock,
  listTtsVoicesMock,
  synthesizeTtsMock,
  validateTtsG2pMock,
} = vi.hoisted(() => ({
  analyzeTtsMock: vi.fn(),
  analyzeTtsPageWithLlmMock: vi.fn(),
  clearTtsCacheMock: vi.fn(),
  listTtsVoicesMock: vi.fn(),
  synthesizeTtsMock: vi.fn(),
  validateTtsG2pMock: vi.fn(),
}));

vi.mock("../use-case", () => ({
  analyzeTts: analyzeTtsMock,
  analyzeTtsPageWithLlm: analyzeTtsPageWithLlmMock,
  clearTtsCache: clearTtsCacheMock,
  listTtsVoices: listTtsVoicesMock,
  synthesizeTts: synthesizeTtsMock,
  validateTtsG2p: validateTtsG2pMock,
}));

describe("tts routes", () => {
  it("returns provider voices", async () => {
    listTtsVoicesMock.mockResolvedValueOnce([
      { provider: "voisona", voiceName: "voice", displayName: "Voice" },
      { provider: "voicevox", voiceName: "3", voiceVersion: "1.0", displayName: "Zunda / Normal" },
    ]);

    const response = await ttsApp.request("/voices");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      options: [
        { provider: "voisona", voiceName: "voice", displayName: "Voice" },
        {
          provider: "voicevox",
          voiceName: "3",
          voiceVersion: "1.0",
          displayName: "Zunda / Normal",
        },
      ],
    });
  });

  it("analyzes text through haqumei-api", async () => {
    const g2p = createG2pItem("hello");
    analyzeTtsMock.mockResolvedValueOnce({ g2p });

    const response = await ttsApp.request("/tts/analyze", {
      method: "POST",
      body: JSON.stringify({ text: "hello" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ g2p });
  });

  it("analyzes a page through OpenRouter", async () => {
    analyzeTtsPageWithLlmMock.mockResolvedValueOnce({
      runId: "run-1",
      logFile: ".logs/llm-g2p/run-1.json",
      requestId: "request-1",
      model: "google/gemini-3.7-flash",
      provider: "google-vertex",
      timings: {
        haqumeiBaselineMs: 1,
        openRouterMs: 2,
        haqumeiValidationMs: 3,
        totalMs: 6,
      },
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        reasoningTokens: 2,
        cachedTokens: 0,
        totalTokens: 15,
        costUsd: 0.001,
      },
      costPerTtsUsd: 0.001,
      monthlyUsdAt3000Tts: 3,
      items: [{ id: "tts-1", status: "unchanged", g2p: createG2pItem("hello") }],
    });

    const response = await ttsApp.request("/tts/analyze/llm", {
      method: "POST",
      body: JSON.stringify({
        pageId: "page-1",
        items: [{ id: "tts-1", provider: "voisona", text: "hello" }],
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(200);
    expect((await response.json()).runId).toBe("run-1");
    expect(analyzeTtsPageWithLlmMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ pageId: "page-1" }),
    );
  });

  it("synthesizes through the selected provider", async () => {
    synthesizeTtsMock.mockResolvedValueOnce({
      audioSrc: "/tts/project/audio.wav",
      outputPath: "/tmp/audio.wav",
      durationSec: 1,
    });

    const response = await ttsApp.request("/tts/synthesize", {
      method: "POST",
      body: JSON.stringify({
        provider: "voisona",
        projectPath: "project",
        text: "hello",
        voiceName: "voice",
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      audioSrc: "/tts/project/audio.wav",
      outputPath: "/tmp/audio.wav",
      durationSec: 1,
    });
  });

  it("clears project tts cache", async () => {
    clearTtsCacheMock.mockResolvedValueOnce({ ok: true });

    const response = await ttsApp.request("/tts/cache", {
      method: "DELETE",
      body: JSON.stringify({ projectPath: "nested/example" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(clearTtsCacheMock).toHaveBeenCalledWith({ projectPath: "nested/example" });
  });

  it("keeps analysis_failed detail on analyze", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    analyzeTtsMock.mockRejectedValueOnce(
      new HaqumeiApiError({
        type: "about:blank",
        title: "Analysis failed",
        status: 500,
        code: "analysis_failed",
        detail: 'texts[0] "hello": mora mismatch: split=8 pitch_nuclei=7',
        errors: [{ path: "texts[0]", reason: "mora_mismatch" }],
      }),
    );

    const response = await ttsApp.request("/tts/analyze", {
      method: "POST",
      body: JSON.stringify({ text: "hello" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'texts[0] "hello": mora mismatch: split=8 pitch_nuclei=7',
      code: "analysis_failed",
      detail: 'texts[0] "hello": mora mismatch: split=8 pitch_nuclei=7',
      errors: [{ path: "texts[0]", reason: "mora_mismatch" }],
    });

    errorSpy.mockRestore();
  });
});
