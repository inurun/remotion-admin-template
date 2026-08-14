import { describe, expect, it, vi } from "vitest";
import { voisonaApp } from "../route";

const { listVoisonaVoicesMock, analyzeVoisonaTextMock, synthesizeVoisonaMock } = vi.hoisted(() => ({
  listVoisonaVoicesMock: vi.fn(),
  analyzeVoisonaTextMock: vi.fn(),
  synthesizeVoisonaMock: vi.fn(),
}));

vi.mock("../use-case", () => ({
  listVoisonaVoices: listVoisonaVoicesMock,
  analyzeVoisonaText: analyzeVoisonaTextMock,
  synthesizeVoisona: synthesizeVoisonaMock,
}));

describe("voisona routes", () => {
  it("returns voices", async () => {
    listVoisonaVoicesMock.mockResolvedValueOnce([
      { provider: "voisona", voiceName: "voice", displayName: "voice", voiceVersion: "1" },
    ]);

    const response = await voisonaApp.request("/voisona/voices");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      options: [
        { provider: "voisona", voiceName: "voice", displayName: "voice", voiceVersion: "1" },
      ],
    });
  });

  it("validates synthesize payloads", async () => {
    const response = await voisonaApp.request("/voisona/synthesize", {
      method: "POST",
      body: JSON.stringify({ text: "", voiceName: "" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
  });
});
