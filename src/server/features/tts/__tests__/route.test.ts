import { describe, expect, it, vi } from "vitest";
import { ttsApp } from "../route";

const { analyzeTtsMock, clearTtsCacheMock, listTtsVoicesMock, synthesizeTtsMock } = vi.hoisted(
  () => ({
    analyzeTtsMock: vi.fn(),
    clearTtsCacheMock: vi.fn(),
    listTtsVoicesMock: vi.fn(),
    synthesizeTtsMock: vi.fn(),
  }),
);

vi.mock("../use-case", () => ({
  analyzeTts: analyzeTtsMock,
  clearTtsCache: clearTtsCacheMock,
  listTtsVoices: listTtsVoicesMock,
  synthesizeTts: synthesizeTtsMock,
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

  it("analyzes through the selected provider", async () => {
    analyzeTtsMock.mockResolvedValueOnce({ analysis: "payload" });

    const response = await ttsApp.request("/tts/analyze", {
      method: "POST",
      body: JSON.stringify({ provider: "voicevox", text: "hello", voiceName: "3" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ analysis: "payload" });
  });

  it("analyzes voicepeak without voiceName", async () => {
    analyzeTtsMock.mockResolvedValueOnce({ analysis: "direct" });

    const response = await ttsApp.request("/tts/analyze", {
      method: "POST",
      body: JSON.stringify({ provider: "voicepeak", text: "hello" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ analysis: "direct" });
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
});
