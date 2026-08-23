import { beforeEach, describe, expect, it, vi } from "vitest";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { HaqumeiApiError } from "@/server/features/haqumei-api/error";
import { getUsableG2p } from "../providers/comparison";
import { OpenRouterError, OpenRouterValidationError } from "../openrouter";

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

const usageA = {
  promptTokens: 10,
  completionTokens: 5,
  reasoningTokens: 2,
  cachedTokens: 1,
  totalTokens: 15,
  costUsd: 0.003,
};

const usageB = {
  promptTokens: 20,
  completionTokens: 8,
  reasoningTokens: 4,
  cachedTokens: 2,
  totalTokens: 28,
  costUsd: 0.005,
};

function structured(id: string, beforeNucleus: string) {
  return {
    id,
    changed: true as const,
    phrases: [
      {
        leadingWords: [],
        accentedWord: { beforeNucleus, afterNucleus: "" },
        trailingWords: [],
        boundaryAfter: "" as const,
      },
    ],
    reason: "文脈",
  };
}

function openRouterResult(
  id: string,
  kana: string,
  usage = usageA,
  extra?: Record<string, unknown>,
) {
  return {
    requestId: "generation-1",
    model: "google/gemini-3.7-flash",
    actualProvider: "google-vertex",
    reasoningEffort: "low",
    structuredOutput: [structured(id, kana.replaceAll("'", ""))],
    renderedKana: [kana],
    corrections: [{ id, changed: true, kana, reason: "文脈" }],
    usage,
    ...extra,
  };
}

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
    requestCorrectionsMock.mockResolvedValueOnce(openRouterResult("tts-1", "ヒトケ'"));

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
    expect(requestCorrectionsMock.mock.calls[0]?.[2]).toMatchObject({ reasoningEffort: "low" });
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
    requestCorrectionsMock.mockResolvedValueOnce(openRouterResult("tts-1", "ニンキ'"));

    const result = await analyzeTtsPageWithLlm(
      { OPENROUTER_API_KEY: "secret" },
      { pageId: "page-1", items: [{ id: "tts-1", provider: "voisona", text: "人気" }] },
    );

    expect(result.items[0]?.status).toBe("unchanged");
  });

  it("retries once after a 422 and then succeeds", async () => {
    analyzeTextsMock.mockResolvedValueOnce([createG2pItem("人気", "ニンキ'")]);
    requestCorrectionsMock
      .mockResolvedValueOnce(openRouterResult("tts-1", "ヒトケ"))
      .mockResolvedValueOnce({
        ...openRouterResult("tts-1", "ヒトケ'", usageB),
        requestId: "generation-2",
        reasoningEffort: "medium",
      });
    validateG2pItemsMock
      .mockRejectedValueOnce(
        new HaqumeiApiError({
          type: "about:blank",
          title: "Invalid G2P",
          status: 422,
          code: "invalid_g2p",
          detail: "items[0].kana is invalid",
          errors: [{ path: "items[0].kana", reason: "invalid_accent_nucleus" }],
        }),
      )
      .mockResolvedValueOnce([createG2pItem("人気", "ヒトケ'")]);

    const result = await analyzeTtsPageWithLlm(
      { OPENROUTER_API_KEY: "secret" },
      { pageId: "page-1", items: [{ id: "tts-1", provider: "voisona", text: "人気" }] },
    );

    expect(requestCorrectionsMock).toHaveBeenCalledTimes(2);
    expect(requestCorrectionsMock.mock.calls[1]?.[2]).toMatchObject({ reasoningEffort: "medium" });
    expect(requestCorrectionsMock.mock.calls[1]?.[2]?.repairItems).toEqual([
      expect.objectContaining({
        id: "tts-1",
        baselineKana: "ニンキ'",
        renderedKana: "ヒトケ",
        previousCorrection: expect.objectContaining({ id: "tts-1" }),
        validationErrors: [
          expect.objectContaining({
            path: "items[0].kana",
            reason: "invalid_accent_nucleus",
            ttsId: "tts-1",
          }),
        ],
      }),
    ]);
    expect(result.items[0]?.status).toBe("corrected");
    expect(result.usage).toEqual({
      promptTokens: 30,
      completionTokens: 13,
      reasoningTokens: 6,
      cachedTokens: 3,
      totalTokens: 43,
      costUsd: 0.008,
    });
    const log = JSON.parse(String(writeFileMock.mock.calls[0]?.[1]));
    expect(log.openRouter).toHaveLength(2);
    expect(result.timings.openRouterMs).toBe(
      log.openRouter[0].timings.openRouterMs + log.openRouter[1].timings.openRouterMs,
    );
    expect(result.timings.haqumeiValidationMs).toBe(
      log.openRouter[0].timings.validationMs + log.openRouter[1].timings.validationMs,
    );
  });

  it("regenerates only failed TTS and keeps successful candidates", async () => {
    analyzeTextsMock.mockResolvedValueOnce([
      createG2pItem("人気", "ニンキ'"),
      createG2pItem("場所", "バショ'"),
    ]);
    requestCorrectionsMock
      .mockResolvedValueOnce({
        requestId: "generation-1",
        model: "google/gemini-3.7-flash",
        actualProvider: "google-vertex",
        reasoningEffort: "low",
        structuredOutput: [structured("tts-1", "ヒトケ"), structured("tts-2", "バショ")],
        renderedKana: ["ヒトケ", "バショ'"],
        corrections: [
          { id: "tts-1", changed: true, kana: "ヒトケ", reason: "読み" },
          { id: "tts-2", changed: true, kana: "バショ'", reason: "維持" },
        ],
        usage: usageA,
      })
      .mockResolvedValueOnce({
        requestId: "generation-2",
        model: "google/gemini-3.7-flash",
        actualProvider: "google-vertex",
        reasoningEffort: "medium",
        structuredOutput: [structured("tts-1", "ヒトケ")],
        renderedKana: ["ヒトケ'"],
        corrections: [{ id: "tts-1", changed: true, kana: "ヒトケ'", reason: "修復" }],
        usage: usageB,
      });
    validateG2pItemsMock
      .mockRejectedValueOnce(
        new HaqumeiApiError({
          type: "about:blank",
          title: "Invalid G2P",
          status: 422,
          code: "invalid_g2p",
          detail: "items[0].kana is invalid",
          errors: [{ path: "items[0].kana", reason: "invalid_accent_nucleus" }],
        }),
      )
      .mockResolvedValueOnce([createG2pItem("人気", "ヒトケ'"), createG2pItem("場所", "バショ'")]);

    const result = await analyzeTtsPageWithLlm(
      { OPENROUTER_API_KEY: "secret" },
      {
        pageId: "page-1",
        items: [
          { id: "tts-1", provider: "voisona", text: "人気" },
          { id: "tts-2", provider: "voisona", text: "場所" },
        ],
      },
    );

    expect(requestCorrectionsMock.mock.calls[1]?.[1]).toEqual([
      expect.objectContaining({ id: "tts-1" }),
    ]);
    expect(validateG2pItemsMock.mock.calls[1]?.[1]).toEqual([
      { text: "人気", kana: "ヒトケ'" },
      { text: "場所", kana: "バショ'" },
    ]);
    expect(result.items[0]?.reason).toBe("修復");
    expect(result.items[1]?.reason).toBe("維持");
  });

  it("does not return an applyable result when the second attempt also fails", async () => {
    analyzeTextsMock.mockResolvedValueOnce([createG2pItem("人気", "ニンキ'")]);
    requestCorrectionsMock
      .mockResolvedValueOnce(openRouterResult("tts-1", "ヒトケ"))
      .mockResolvedValueOnce({
        ...openRouterResult("tts-1", "ヒトケ", usageB),
        requestId: "generation-2",
      });
    validateG2pItemsMock
      .mockRejectedValueOnce(
        new HaqumeiApiError({
          type: "about:blank",
          title: "Invalid G2P",
          status: 422,
          code: "invalid_g2p",
          detail: "items[0].kana is invalid",
          errors: [{ path: "items[0].kana", reason: "invalid_accent_nucleus" }],
        }),
      )
      .mockRejectedValueOnce(
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
    expect(validateG2pItemsMock).toHaveBeenCalledTimes(2);
    const log = JSON.parse(String(writeFileMock.mock.calls[0]?.[1]));
    expect(log.status).toBe("failure");
    expect(log.openRouter).toHaveLength(2);
    expect(log.openRouter[1].validationErrors).toEqual([
      expect.objectContaining({ reason: "invalid_kana_syntax", ttsId: "tts-1" }),
    ]);
  });

  it.each([401, 403, 404])("does not retry OpenRouter HTTP %s", async (status) => {
    analyzeTextsMock.mockResolvedValueOnce([createG2pItem("人気", "ニンキ'")]);
    requestCorrectionsMock.mockRejectedValueOnce(
      new OpenRouterError(`HTTP ${status}`, status, "denied"),
    );

    await expect(
      analyzeTtsPageWithLlm(
        { OPENROUTER_API_KEY: "secret" },
        { pageId: "page-1", items: [{ id: "tts-1", provider: "voisona", text: "人気" }] },
      ),
    ).rejects.toThrow(`HTTP ${status}`);
    expect(requestCorrectionsMock).toHaveBeenCalledTimes(1);
    expect(validateG2pItemsMock).not.toHaveBeenCalled();
  });

  it("retries OpenRouter structured validation failures once", async () => {
    analyzeTextsMock.mockResolvedValueOnce([createG2pItem("人気", "ニンキ'")]);
    requestCorrectionsMock
      .mockRejectedValueOnce(
        new OpenRouterValidationError(
          "OpenRouter structured output failed validation",
          "generation-1",
          "google/gemini-3.7-flash",
          "google-vertex",
          usageA,
          [
            {
              path: "items.0.phrases",
              reason: "changed=true requires at least one phrase",
              ttsId: "tts-1",
            },
          ],
        ),
      )
      .mockResolvedValueOnce(openRouterResult("tts-1", "ヒトケ'", usageB));
    validateG2pItemsMock.mockResolvedValueOnce([createG2pItem("人気", "ヒトケ'")]);

    const result = await analyzeTtsPageWithLlm(
      { OPENROUTER_API_KEY: "secret" },
      { pageId: "page-1", items: [{ id: "tts-1", provider: "voisona", text: "人気" }] },
    );

    expect(requestCorrectionsMock).toHaveBeenCalledTimes(2);
    expect(result.items[0]?.status).toBe("corrected");
  });

  it("retries null content and keeps finishReason in the attempt log", async () => {
    analyzeTextsMock.mockResolvedValueOnce([createG2pItem("人気", "ニンキ'")]);
    requestCorrectionsMock
      .mockRejectedValueOnce(
        new OpenRouterValidationError(
          "OpenRouter returned empty structured output",
          "generation-1",
          "google/gemini-3.7-flash",
          "google-vertex",
          usageA,
          [{ path: "choices.0.message.content", reason: "null" }],
          undefined,
          undefined,
          "length",
        ),
      )
      .mockResolvedValueOnce({
        ...openRouterResult("tts-1", "ヒトケ'", usageB),
        finishReason: "stop",
      });
    validateG2pItemsMock.mockResolvedValueOnce([createG2pItem("人気", "ヒトケ'")]);

    await analyzeTtsPageWithLlm(
      { OPENROUTER_API_KEY: "secret" },
      { pageId: "page-1", items: [{ id: "tts-1", provider: "voisona", text: "人気" }] },
    );

    expect(requestCorrectionsMock).toHaveBeenCalledTimes(2);
    const log = JSON.parse(String(writeFileMock.mock.calls[0]?.[1]));
    expect(log.openRouter[0].finishReason).toBe("length");
    expect(log.openRouter[1].finishReason).toBe("stop");
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
