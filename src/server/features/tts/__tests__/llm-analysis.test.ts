import { beforeEach, describe, expect, it, vi } from "vitest";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { HaqumeiApiError } from "@/server/features/haqumei-api/error";
import { getUsableG2p } from "../providers/comparison";

const { analyzeTextsMock, mkdirMock, requestCorrectionsMock, validateG2pItemsMock, writeFileMock } =
  vi.hoisted(() => ({
    analyzeTextsMock: vi.fn(),
    mkdirMock: vi.fn(),
    requestCorrectionsMock: vi.fn(),
    validateG2pItemsMock: vi.fn(),
    writeFileMock: vi.fn(),
  }));

vi.mock("node:fs/promises", () => ({
  default: { mkdir: mkdirMock, writeFile: writeFileMock },
}));
vi.mock("@/server/features/haqumei-api/analyze", () => ({ analyzeTexts: analyzeTextsMock }));
vi.mock("@/server/features/haqumei-api/validate", () => ({
  validateG2pItems: validateG2pItemsMock,
}));
vi.mock("../openrouter", async (importOriginal) => {
  const original = await importOriginal<typeof import("../openrouter")>();
  return { ...original, requestOpenRouterCorrections: requestCorrectionsMock };
});

import { analyzeTtsPageWithLlm } from "../llm-analysis";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("analyzeTtsPageWithLlm", () => {
  it("runs one page request and validates all items", async () => {
    const baseline = createG2pItem("人気", "ニンキ'");
    const corrected = createG2pItem("人気", "ヒトケ'");
    analyzeTextsMock.mockResolvedValueOnce([baseline]);
    validateG2pItemsMock.mockResolvedValueOnce([corrected]);
    requestCorrectionsMock.mockResolvedValueOnce({
      requestId: "generation-1",
      model: "google/gemini-3.7-flash",
      actualProvider: "google-vertex",
      corrections: [{ id: "tts-1", changed: false, kana: "ヒトケ'", reason: "文脈" }],
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        reasoningTokens: 2,
        cachedTokens: 0,
        totalTokens: 15,
        costUsd: 0.003,
      },
    });

    const result = await analyzeTtsPageWithLlm(
      { OPENROUTER_API_KEY: "secret" },
      {
        pageId: "page-1",
        items: [
          { id: "tts-1", provider: "voisona", text: "人気" },
          { id: "tts-2", provider: "voicevox", text: "" },
          { id: "tts-3", provider: "voicepeak", text: "skip" },
        ],
      },
    );

    expect(requestCorrectionsMock).toHaveBeenCalledTimes(1);
    expect(analyzeTextsMock).toHaveBeenCalledTimes(1);
    expect(analyzeTextsMock).toHaveBeenCalledWith(expect.anything(), ["人気"]);
    expect(validateG2pItemsMock).toHaveBeenCalledTimes(1);
    expect(validateG2pItemsMock).toHaveBeenCalledWith(expect.anything(), [
      { text: "人気", kana: "ヒトケ'" },
    ]);
    expect(result.items.map((item) => item.status)).toEqual(["corrected", "skipped", "skipped"]);
    expect(getUsableG2p(result.items[0]?.g2p, "人気")).toEqual(corrected);
    expect(result.items[0]?.baselineKana).toBe("ニンキ'");
    expect(result.items[0]?.correctedKana).toBe("ヒトケ'");
    expect(result.monthlyUsdAt3000Tts).toBe(9);
    expect(writeFileMock).toHaveBeenCalledOnce();
    expect(String(writeFileMock.mock.calls[0]?.[1])).toContain('"text": "人気"');
  });

  it("treats normalized kana equal to baseline as unchanged", async () => {
    const baseline = createG2pItem("人気", "ニンキ'");
    analyzeTextsMock.mockResolvedValueOnce([baseline]);
    validateG2pItemsMock.mockResolvedValueOnce([baseline]);
    requestCorrectionsMock.mockResolvedValueOnce({
      requestId: "generation-1",
      model: "google/gemini-3.7-flash",
      corrections: [{ id: "tts-1", changed: true, kana: "ニンキ'", reason: "維持" }],
      usage: {
        promptTokens: 1,
        completionTokens: 1,
        reasoningTokens: 0,
        cachedTokens: 0,
        totalTokens: 2,
        costUsd: 0,
      },
    });

    const result = await analyzeTtsPageWithLlm(
      { OPENROUTER_API_KEY: "secret" },
      { pageId: "page-1", items: [{ id: "tts-1", provider: "voisona", text: "人気" }] },
    );

    expect(result.items[0]?.status).toBe("unchanged");
  });

  it("fails the page on validate 422", async () => {
    analyzeTextsMock.mockResolvedValueOnce([createG2pItem("人気", "ニンキ'")]);
    requestCorrectionsMock.mockResolvedValueOnce({
      requestId: "generation-1",
      model: "google/gemini-3.7-flash",
      corrections: [{ id: "tts-1", changed: true, kana: "ニンキ'|", reason: "bad" }],
      usage: {
        promptTokens: 1,
        completionTokens: 1,
        reasoningTokens: 0,
        cachedTokens: 0,
        totalTokens: 2,
        costUsd: 0,
      },
    });
    validateG2pItemsMock.mockRejectedValueOnce(
      new HaqumeiApiError({
        type: "about:blank",
        title: "Invalid G2P",
        status: 422,
        code: "invalid_g2p",
        detail: "items[0].kana is invalid",
        errors: [{ path: "items[0].kana", reason: "invalid_kana_syntax" }],
      }),
    );

    await expect(
      analyzeTtsPageWithLlm(
        { OPENROUTER_API_KEY: "secret" },
        { pageId: "page-1", items: [{ id: "tts-1", provider: "voisona", text: "人気" }] },
      ),
    ).rejects.toThrow("items[0].kana: invalid_kana_syntax (tts-1)");
    expect(String(writeFileMock.mock.calls[0]?.[1])).toContain('"status": "failure"');
  });

  it("fails before OpenRouter when the validate batch is too large", async () => {
    const items = Array.from({ length: 257 }, (_, index) => ({
      id: `tts-${index}`,
      provider: "voisona" as const,
      text: `t${index}`,
    }));

    await expect(
      analyzeTtsPageWithLlm({ OPENROUTER_API_KEY: "secret" }, { pageId: "page-1", items }),
    ).rejects.toThrow(/exceeds 256 items/);
    expect(requestCorrectionsMock).not.toHaveBeenCalled();
    expect(analyzeTextsMock).not.toHaveBeenCalled();
  });

  it("writes a failure log without returning partial results", async () => {
    analyzeTextsMock.mockResolvedValueOnce([createG2pItem("人気")]);
    requestCorrectionsMock.mockRejectedValueOnce(new Error("provider failed"));

    await expect(
      analyzeTtsPageWithLlm(
        { OPENROUTER_API_KEY: "secret" },
        { pageId: "page-1", items: [{ id: "tts-1", provider: "voisona", text: "人気" }] },
      ),
    ).rejects.toThrow("provider failed");
    expect(writeFileMock).toHaveBeenCalledOnce();
    expect(String(writeFileMock.mock.calls[0]?.[1])).toContain('"status": "failure"');
    expect(validateG2pItemsMock).not.toHaveBeenCalled();
  });
});
