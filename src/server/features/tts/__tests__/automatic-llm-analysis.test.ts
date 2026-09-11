import { beforeEach, describe, expect, it, vi } from "vitest";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { OpenRouterValidationError } from "../openrouter";

const {
  mkdirMock,
  requestCorrectionsMock,
  validateG2pItemMock,
  validateG2pItemsMock,
  writeFileMock,
} = vi.hoisted(() => ({
  mkdirMock: vi.fn(),
  requestCorrectionsMock: vi.fn(),
  validateG2pItemMock: vi.fn(),
  validateG2pItemsMock: vi.fn(),
  writeFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: { mkdir: mkdirMock, writeFile: writeFileMock },
}));
vi.mock("@/server/features/haqumei-api/validate", () => ({
  validateG2pItem: validateG2pItemMock,
  validateG2pItems: validateG2pItemsMock,
}));
vi.mock("../openrouter", async (importOriginal) => {
  const original = await importOriginal<typeof import("../openrouter")>();
  return { ...original, requestOpenRouterCorrections: requestCorrectionsMock };
});

import { runAutomaticG2pBatch } from "../automatic-llm-analysis";

function target(id: string, text: string, kana: string) {
  return {
    pageId: "page-1",
    ttsId: id,
    analysisKey: `key-${id}`,
    text,
    readText: text,
    baseline: createG2pItem(text, kana),
  };
}

function phrase(beforeNucleus: string, leadingWords: string[] = []) {
  return {
    leadingWords,
    accentedWord: { beforeNucleus, afterNucleus: "" },
    trailingWords: [],
    boundaryAfter: "" as const,
  };
}

beforeEach(() => {
  mkdirMock.mockReset().mockResolvedValue(undefined);
  writeFileMock.mockReset().mockResolvedValue(undefined);
  requestCorrectionsMock.mockReset();
  validateG2pItemsMock.mockReset();
  validateG2pItemMock.mockReset();
});

describe("automatic G2P batch", () => {
  it("applies valid corrections and keeps baseline for topology failures", async () => {
    const corrected = createG2pItem("人気", "ヒトケ'");
    requestCorrectionsMock.mockResolvedValueOnce({
      requestId: "generation-1",
      model: "google/gemma-4-31b-it",
      actualProvider: "CoreWeave",
      reasoningEffort: "low",
      finishReason: "stop",
      structuredOutput: [
        {
          id: "tts-1",
          changed: true,
          phrases: [phrase("ヒトケ")],
          reason: "人気をヒトケへ",
        },
        {
          id: "tts-2",
          changed: true,
          phrases: [phrase("デ", ["ココ"])],
          reason: "出よう",
        },
      ],
      renderedKana: ["ヒトケ'", "ココ|デ'"],
      corrections: [
        { id: "tts-1", changed: true, kana: "ヒトケ'", reason: "人気をヒトケへ" },
        { id: "tts-2", changed: true, kana: "ココ|デ'", reason: "出よう" },
      ],
      usage: {
        promptTokens: 1,
        completionTokens: 1,
        reasoningTokens: 0,
        cachedTokens: 0,
        totalTokens: 2,
        costUsd: 0,
      },
    });
    validateG2pItemsMock.mockResolvedValueOnce([corrected]);

    const result = await runAutomaticG2pBatch(
      {},
      {
        pages: [],
        targets: [
          target("tts-1", "人気", "ニンキ'"),
          target("tts-2", "ここを出よう", "ココ|ヲ'/ダ|ヨ'ー"),
        ],
      },
    );

    expect(result.fallback).toBe(false);
    expect(result.log.status).toBe("partial");
    expect(result.g2pByTtsId.get("tts-1")).toBe(corrected);
    expect(result.g2pByTtsId.get("tts-2")?.kana).toBe("ココ|ヲ'/ダ|ヨ'ー");
    expect(validateG2pItemsMock).toHaveBeenCalledWith(expect.anything(), [
      { text: "人気", kana: "ヒトケ'" },
    ]);
    expect(result.log.items).toEqual([
      { ttsId: "tts-2", applied: "baseline", reason: "automatic topology changed for TTS tts-2" },
      { ttsId: "tts-1", applied: "corrected", reason: "人気をヒトケへ" },
    ]);
  });

  it("logs usage and raw OpenRouter output when structured content is empty", async () => {
    const error = new OpenRouterValidationError(
      "OpenRouter returned empty structured output",
      "generation-1",
      "google/gemma-4-31b-it",
      "CoreWeave",
      {
        promptTokens: 900,
        completionTokens: 1024,
        reasoningTokens: 1024,
        cachedTokens: 0,
        totalTokens: 1924,
        costUsd: 0.001,
      },
      [
        { path: "choices.0.message.content", reason: "null" },
        { path: "choices.0.finish_reason", reason: "length" },
      ],
      undefined,
      undefined,
      "length",
      {
        id: "generation-1",
        choices: [{ finish_reason: "length", message: { content: null } }],
        usage: { completion_tokens: 1024 },
      },
    );
    requestCorrectionsMock.mockRejectedValueOnce(error);

    const result = await runAutomaticG2pBatch(
      {},
      {
        pages: [],
        targets: [target("tts-1", "人気", "ニンキ'")],
      },
    );

    expect(result.fallback).toBe(true);
    expect(result.log.status).toBe("fallback");
    expect(result.log.error).toMatchObject({
      finishReason: "length",
      usage: { completionTokens: 1024, reasoningTokens: 1024 },
      rawResponse: {
        choices: [{ finish_reason: "length", message: { content: null } }],
      },
    });
  });
});
