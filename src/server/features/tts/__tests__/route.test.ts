import { describe, expect, it, vi } from "vitest";
import { ttsApp } from "../route";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";

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
