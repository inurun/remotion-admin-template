import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ameKoroAnalyzeItem,
  createAnalyzeItem,
  createG2pItem,
} from "@/_schemas/__tests__/g2p-fixture";
import { HaqumeiApiError } from "@/server/features/haqumei-api/error";
import { getUsableG2p } from "../providers/comparison";
import { OpenRouterError, OpenRouterValidationError } from "../openrouter";

const {
  analyzeTextsMock,
  mkdirMock,
  requestCorrectionsMock,
  validateG2pItemMock,
  validateG2pItemsMock,
  writeFileMock,
} = vi.hoisted(() => ({
  analyzeTextsMock: vi.fn(),
  mkdirMock: vi.fn(),
  requestCorrectionsMock: vi.fn(),
  validateG2pItemMock: vi.fn(),
  validateG2pItemsMock: vi.fn(),
  writeFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: { mkdir: mkdirMock, writeFile: writeFileMock },
}));
vi.mock("@/server/features/haqumei-api/analyze", () => ({ analyzeTexts: analyzeTextsMock }));
vi.mock("@/server/features/haqumei-api/validate", () => ({
  validateG2pItem: validateG2pItemMock,
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

function structured(id: string, kana: string, reason = "文脈") {
  return {
    id,
    changed: true as const,
    kana,
    reason,
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
    model: "openai/gpt-5.6-luna",
    actualProvider: "openai",
    reasoningEffort: "none",
    structuredOutput: [structured(id, kana)],
    renderedKana: [kana],
    corrections: [{ id, changed: true, kana, reason: "文脈" }],
    usage,
    rawResponse: { id: "generation-1", model: "openai/gpt-5.6-luna" },
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
    expect(requestCorrectionsMock.mock.calls[0]?.[2]).toMatchObject({
      profile: expect.objectContaining({
        id: "gemini-3.8-flash",
        reasoningEffort: "low",
      }),
      reasoningEffort: "low",
    });
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
    expect(String(writeFileMock.mock.calls[0]?.[0])).toContain("llm-g2p/manual/");
    const log = JSON.parse(String(writeFileMock.mock.calls[0]?.[1]));
    expect(log.openRouter[0].rawResponse).toEqual({
      id: "generation-1",
      model: "openai/gpt-5.6-luna",
    });
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

  it("sends dictionaryWords for tracked baseline words and omits empty or unknown provenance", async () => {
    analyzeTextsMock.mockResolvedValueOnce([
      ameKoroAnalyzeItem,
      createAnalyzeItem("こんにちは", "コンニチワ'", []),
      createAnalyzeItem("対象", "タイショウ'", null),
    ]);
    requestCorrectionsMock.mockResolvedValueOnce({
      requestId: "generation-1",
      model: "openai/gpt-5.6-luna",
      actualProvider: "openai",
      reasoningEffort: "none",
      structuredOutput: [
        { id: "tts-1", changed: false, kana: "", reason: "維持" },
        { id: "tts-2", changed: false, kana: "", reason: "維持" },
        { id: "tts-3", changed: false, kana: "", reason: "維持" },
      ],
      renderedKana: ["", "", ""],
      corrections: [
        { id: "tts-1", changed: false, kana: "アメコロ'", reason: "維持" },
        { id: "tts-2", changed: false, kana: "コンニチワ'", reason: "維持" },
        { id: "tts-3", changed: false, kana: "タイショウ'", reason: "維持" },
      ],
      usage: usageA,
      rawResponse: { id: "generation-1" },
    });

    const result = await analyzeTtsPageWithLlm(
      { OPENROUTER_API_KEY: "secret" },
      {
        pageId: "page-1",
        items: [
          { id: "tts-1", provider: "voisona", text: "雨衣" },
          { id: "tts-2", provider: "voisona", text: "こんにちは" },
          { id: "tts-3", provider: "voisona", text: "対象" },
        ],
      },
    );

    expect(requestCorrectionsMock.mock.calls[0]?.[1]).toEqual([
      expect.objectContaining({
        id: "tts-1",
        kana: "アメコロ'",
        dictionaryWords: [{ word_index: 0, kind: "fixed" }],
      }),
      expect.objectContaining({
        id: "tts-2",
        kana: "コンニチワ'",
      }),
      expect.objectContaining({
        id: "tts-3",
        kana: "タイショウ'",
      }),
    ]);
    expect(requestCorrectionsMock.mock.calls[0]?.[1][1]).not.toHaveProperty("dictionaryWords");
    expect(requestCorrectionsMock.mock.calls[0]?.[1][2]).not.toHaveProperty("dictionaryWords");
    expect(result.items[0]?.g2p).toEqual(ameKoroAnalyzeItem);
    const log = JSON.parse(String(writeFileMock.mock.calls[0]?.[1]));
    expect(log.dictionaryProvenance).toEqual([
      {
        id: "tts-1",
        dictionary_words: [{ word_index: 0, kind: "fixed" }],
        sent: [{ word_index: 0, kind: "fixed" }],
      },
      { id: "tts-2", dictionary_words: [], sent: null },
      { id: "tts-3", dictionary_words: null, sent: null },
    ]);
  });

  it("forwards neighboring TTS to OpenRouter without analyzing them", async () => {
    analyzeTextsMock.mockResolvedValueOnce([createG2pItem("人気", "ニンキ'")]);
    validateG2pItemsMock.mockResolvedValueOnce([createG2pItem("人気", "ヒトケ'")]);
    requestCorrectionsMock.mockResolvedValueOnce(openRouterResult("tts-1", "ヒトケ'"));

    const result = await analyzeTtsPageWithLlm(
      { OPENROUTER_API_KEY: "secret" },
      {
        pageId: "page-1",
        items: [
          {
            id: "tts-1",
            provider: "voisona",
            text: "人気",
            previous: { text: "前の文" },
            next: { text: "次の文", readText: "つぎ" },
          },
        ],
      },
    );

    expect(analyzeTextsMock).toHaveBeenCalledWith(expect.anything(), ["人気"]);
    expect(requestCorrectionsMock.mock.calls[0]?.[1]).toEqual([
      expect.objectContaining({
        id: "tts-1",
        text: "人気",
        previous: { text: "前の文" },
        next: { text: "次の文", readText: "つぎ" },
      }),
    ]);
    expect(validateG2pItemsMock).toHaveBeenCalledWith(expect.anything(), [
      { text: "人気", kana: "ヒトケ'" },
    ]);
    expect(result.items).toHaveLength(1);
  });

  it("retries once after a 422 and then succeeds", async () => {
    const baseline = createAnalyzeItem("人気", "ニンキ'", [{ word_index: 0, kind: "contextual" }]);
    analyzeTextsMock.mockResolvedValueOnce([baseline]);
    requestCorrectionsMock
      .mockResolvedValueOnce(openRouterResult("tts-1", "ヒトケ'"))
      .mockResolvedValueOnce({
        ...openRouterResult("tts-1", "ヒトケ'", usageB),
        requestId: "generation-2",
        reasoningEffort: "none",
      });
    validateG2pItemsMock
      .mockRejectedValueOnce(
        new HaqumeiApiError({
          type: "about:blank",
          title: "Invalid G2P",
          status: 422,
          code: "invalid_g2p",
          detail: 'items[0].kana: missing accent marker (\') in "ヒトケ"',
          errors: [
            {
              path: "items[0].kana",
              reason: "invalid_accent_nucleus",
              message: 'missing accent marker (\') in "ヒトケ"',
            },
          ],
        }),
      )
      .mockResolvedValueOnce([createG2pItem("人気", "ヒトケ'")]);

    const result = await analyzeTtsPageWithLlm(
      { OPENROUTER_API_KEY: "secret" },
      { pageId: "page-1", items: [{ id: "tts-1", provider: "voisona", text: "人気" }] },
    );

    expect(requestCorrectionsMock).toHaveBeenCalledTimes(2);
    expect(requestCorrectionsMock.mock.calls[1]?.[2]).toMatchObject({ reasoningEffort: "low" });
    expect(requestCorrectionsMock.mock.calls[1]?.[2]?.repairItems).toEqual([
      expect.objectContaining({
        id: "tts-1",
        text: "人気",
        readText: "人気",
        baselineKana: "ニンキ'",
        previousKana: "ヒトケ'",
        dictionaryWords: [{ word_index: 0, kind: "contextual" }],
        errors: [
          expect.objectContaining({
            kind: "validate",
            message: 'missing accent marker (\') in "ヒトケ"',
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
        model: "openai/gpt-5.6-luna",
        actualProvider: "openai",
        reasoningEffort: "none",
        structuredOutput: [structured("tts-1", "ヒトケ"), structured("tts-2", "バショ'")],
        renderedKana: ["ヒトケ", "バショ'"],
        corrections: [
          { id: "tts-1", changed: true, kana: "ヒトケ", reason: "読み" },
          { id: "tts-2", changed: true, kana: "バショ'", reason: "維持" },
        ],
        usage: usageA,
      })
      .mockResolvedValueOnce({
        requestId: "generation-2",
        model: "openai/gpt-5.6-luna",
        actualProvider: "openai",
        reasoningEffort: "none",
        structuredOutput: [structured("tts-1", "ヒトケ'")],
        renderedKana: ["ヒトケ'"],
        corrections: [{ id: "tts-1", changed: true, kana: "ヒトケ'", reason: "修復" }],
        usage: usageB,
      });
    validateG2pItemsMock
      .mockResolvedValueOnce([createG2pItem("場所", "バショ'")])
      .mockResolvedValueOnce([createG2pItem("人気", "ヒトケ'")]);

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
    expect(requestCorrectionsMock.mock.calls[1]?.[2]?.repairItems).toEqual([
      expect.objectContaining({
        id: "tts-1",
        previousKana: "ヒトケ",
        errors: [expect.objectContaining({ kind: "syntax" })],
      }),
    ]);
    expect(validateG2pItemsMock.mock.calls[0]?.[1]).toEqual([{ text: "場所", kana: "バショ'" }]);
    expect(validateG2pItemsMock.mock.calls[1]?.[1]).toEqual([{ text: "人気", kana: "ヒトケ'" }]);
    expect(result.items[0]?.reason).toBe("修復");
    expect(result.items[1]?.reason).toBe("維持");
  });

  it("does not return an applyable result when the second attempt also fails", async () => {
    analyzeTextsMock.mockResolvedValueOnce([createG2pItem("人気", "ニンキ'")]);
    requestCorrectionsMock
      .mockResolvedValueOnce(openRouterResult("tts-1", "ヒトケ'"))
      .mockResolvedValueOnce({
        ...openRouterResult("tts-1", "ヒトケ'", usageB),
        requestId: "generation-2",
      });
    validateG2pItemsMock
      .mockRejectedValueOnce(
        new HaqumeiApiError({
          type: "about:blank",
          title: "Invalid G2P",
          status: 422,
          code: "invalid_g2p",
          detail: 'items[0].kana: missing accent marker (\') in "ヒトケ"',
          errors: [
            {
              path: "items[0].kana",
              reason: "invalid_accent_nucleus",
              message: 'missing accent marker (\') in "ヒトケ"',
            },
          ],
        }),
      )
      .mockRejectedValueOnce(
        new HaqumeiApiError({
          type: "about:blank",
          title: "Invalid G2P",
          status: 422,
          code: "invalid_g2p",
          detail: 'items[0].kana: hiragana is not allowed in "ヒトけ"',
          errors: [
            {
              path: "items[0].kana",
              reason: "invalid_kana_syntax",
              message: 'hiragana is not allowed in "ヒトけ"',
            },
          ],
        }),
      );

    await expect(
      analyzeTtsPageWithLlm(
        { OPENROUTER_API_KEY: "secret" },
        { pageId: "page-1", items: [{ id: "tts-1", provider: "voisona", text: "人気" }] },
      ),
    ).rejects.toThrow('validate: hiragana is not allowed in "ヒトけ" (tts-1)');
    expect(validateG2pItemsMock).toHaveBeenCalledTimes(2);
    const log = JSON.parse(String(writeFileMock.mock.calls[0]?.[1]));
    expect(log.status).toBe("failure");
    expect(log.openRouter).toHaveLength(2);
    expect(log.openRouter[1].validationErrors).toEqual([
      expect.objectContaining({ reason: 'hiragana is not allowed in "ヒトけ"', ttsId: "tts-1" }),
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
          "openai/gpt-5.6-luna",
          "openai",
          usageA,
          [
            {
              path: "items.0.kana",
              reason: "changed=true requires kana",
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
          "openai/gpt-5.6-luna",
          "openai",
          usageA,
          [{ path: "choices.0.message.content", reason: "null" }],
          undefined,
          undefined,
          "length",
          { id: "generation-1", choices: [{ message: { content: null } }] },
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
    expect(log.openRouter[0].rawResponse).toEqual({
      id: "generation-1",
      choices: [{ message: { content: null } }],
    });
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
