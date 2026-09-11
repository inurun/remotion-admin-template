import { beforeEach, describe, expect, it, vi } from "vitest";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { HaqumeiApiError } from "@/server/features/haqumei-api/error";
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

const usage = {
  promptTokens: 1,
  completionTokens: 1,
  reasoningTokens: 0,
  cachedTokens: 0,
  totalTokens: 2,
  costUsd: 0,
};

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

function openRouterResult(
  items: Array<{ id: string; changed: boolean; kana: string; reason: string }>,
) {
  return {
    requestId: "generation-1",
    model: "google/gemma-4-31b-it",
    actualProvider: "CoreWeave",
    reasoningEffort: "low",
    finishReason: "stop",
    structuredOutput: items,
    renderedKana: items.map((item) => item.kana),
    corrections: items.map((item) => ({
      id: item.id,
      changed: item.changed,
      kana: item.kana,
      reason: item.reason,
    })),
    usage,
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
  it("repairs only syntax, topology, and Validate failures and keeps round-1 OK items", async () => {
    const ok = createG2pItem("人気", "ヒトケ'");
    const repaired = createG2pItem("対象", "タイショウ'");
    requestCorrectionsMock
      .mockResolvedValueOnce(
        openRouterResult([
          { id: "tts-ok", changed: true, kana: "ヒトケ'", reason: "人気をヒトケへ" },
          { id: "tts-syntax", changed: true, kana: "ニンキ", reason: "核なし" },
          { id: "tts-topology", changed: true, kana: "ココ|デ'", reason: "出よう" },
          { id: "tts-validate", changed: true, kana: "タイショウ'", reason: "対象" },
        ]),
      )
      .mockResolvedValueOnce(
        openRouterResult([
          { id: "tts-topology", changed: true, kana: "ココ|デ'", reason: "出よう" },
          { id: "tts-validate", changed: true, kana: "タイショウ'", reason: "対象" },
        ]),
      );
    validateG2pItemsMock
      .mockRejectedValueOnce(
        new HaqumeiApiError({
          type: "about:blank",
          title: "Invalid G2P",
          status: 422,
          code: "invalid_g2p",
          detail: 'items[0].kana: missing accent marker (\') in "タイショウ"',
          errors: [
            {
              path: "items[0].kana",
              reason: "invalid_accent_nucleus",
              message: 'missing accent marker (\') in "タイショウ"',
            },
          ],
        }),
      )
      .mockResolvedValueOnce([repaired]);
    validateG2pItemMock.mockResolvedValueOnce(ok).mockRejectedValueOnce(
      new HaqumeiApiError({
        type: "about:blank",
        title: "Invalid G2P",
        status: 422,
        code: "invalid_g2p",
        detail: 'item.kana: missing accent marker (\') in "タイショウ"',
        errors: [
          {
            path: "item.kana",
            reason: "invalid_accent_nucleus",
            message: 'missing accent marker (\') in "タイショウ"',
          },
        ],
      }),
    );

    const result = await runAutomaticG2pBatch(
      {},
      {
        pages: [],
        targets: [
          target("tts-ok", "人気", "ニンキ'"),
          target("tts-syntax", "核", "ニンキ'"),
          target("tts-topology", "ここを出よう", "ココ|ヲ'/ダ|ヨ'ー"),
          target("tts-validate", "対象", "タイショウ'"),
        ],
      },
    );

    expect(requestCorrectionsMock).toHaveBeenCalledTimes(2);
    expect(
      requestCorrectionsMock.mock.calls[1]?.[1].map((item: { id: string }) => item.id),
    ).toEqual(["tts-topology", "tts-validate"]);
    expect(requestCorrectionsMock.mock.calls[1]?.[2]?.repairItems).toEqual([
      expect.objectContaining({
        id: "tts-topology",
        previousKana: "ココ|デ'",
        errors: [expect.objectContaining({ kind: "topology" })],
      }),
      expect.objectContaining({
        id: "tts-validate",
        previousKana: "タイショウ'",
        errors: [expect.objectContaining({ kind: "validate" })],
      }),
    ]);
    expect(result.g2pByTtsId.get("tts-ok")).toBe(ok);
    expect(result.g2pByTtsId.get("tts-syntax")?.kana).toBe("ニンキ'");
    expect(result.log.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ ttsId: "tts-syntax", remounted: true })]),
    );
    expect(result.g2pByTtsId.get("tts-topology")?.kana).toBe("ココ|ヲ'/ダ|ヨ'ー");
    expect(result.g2pByTtsId.get("tts-validate")?.kana).toBe("タイショウ'");
    expect(validateG2pItemsMock.mock.calls[0]?.[1]).toEqual([
      { text: "人気", kana: "ヒトケ'" },
      { text: "対象", kana: "タイショウ'" },
    ]);
  });

  it("remounts a mildly broken DSL onto the baseline frame without a second request", async () => {
    const remounted = createG2pItem("上手な人が", "ジョウズ|ナ'");
    requestCorrectionsMock.mockResolvedValueOnce(
      openRouterResult([
        { id: "tts-1", changed: true, kana: "ジョ'ウズ|ナ'", reason: "上手な（じょうずな）" },
      ]),
    );
    validateG2pItemsMock.mockResolvedValueOnce([remounted]);

    const result = await runAutomaticG2pBatch(
      {},
      { pages: [], targets: [target("tts-1", "上手な人が", "カミテ|ナ'")] },
    );

    expect(requestCorrectionsMock).toHaveBeenCalledTimes(1);
    expect(validateG2pItemsMock.mock.calls[0]?.[1]).toEqual([
      { text: "上手な人が", kana: "ジョウズ|ナ'" },
    ]);
    expect(result.fallback).toBe(false);
    expect(result.g2pByTtsId.get("tts-1")).toBe(remounted);
    expect(result.log.items).toEqual([
      expect.objectContaining({
        ttsId: "tts-1",
        applied: "corrected",
        remounted: true,
      }),
    ]);
  });

  it("keeps per-item baseline reasons when remount cannot recover the frame", async () => {
    requestCorrectionsMock
      .mockResolvedValueOnce(
        openRouterResult([
          { id: "tts-a", changed: true, kana: "ココ|デ'", reason: "出よう" },
          { id: "tts-b", changed: true, kana: "イチ|バ'", reason: "市場" },
        ]),
      )
      .mockResolvedValueOnce(
        openRouterResult([
          { id: "tts-a", changed: true, kana: "ココ|デ'", reason: "出よう" },
          { id: "tts-b", changed: true, kana: "イチ|バ'", reason: "市場" },
        ]),
      );

    const result = await runAutomaticG2pBatch(
      {},
      {
        pages: [],
        targets: [
          target("tts-a", "ここを出よう", "ココ|ヲ'/ダ|ヨ'ー"),
          target("tts-b", "市場で", "シ'ジョー|デ|カラ"),
        ],
      },
    );

    expect(requestCorrectionsMock).toHaveBeenCalledTimes(2);
    const items = result.log.items as Array<{ ttsId: string; reason?: string }>;
    const reasonA = items.find((item) => item.ttsId === "tts-a")?.reason ?? "";
    const reasonB = items.find((item) => item.ttsId === "tts-b")?.reason ?? "";
    expect(reasonA).toContain("phrase count");
    expect(reasonA).not.toContain("word slots");
    expect(reasonB).toContain("word slots");
    expect(reasonB).not.toContain("phrase count");
  });

  it("does not send a second request when every item passes", async () => {
    const corrected = createG2pItem("人気", "ヒトケ'");
    requestCorrectionsMock.mockResolvedValueOnce(
      openRouterResult([{ id: "tts-1", changed: true, kana: "ヒトケ'", reason: "人気をヒトケへ" }]),
    );
    validateG2pItemsMock.mockResolvedValueOnce([corrected]);

    const result = await runAutomaticG2pBatch(
      {},
      { pages: [], targets: [target("tts-1", "人気", "ニンキ'")] },
    );

    expect(requestCorrectionsMock).toHaveBeenCalledTimes(1);
    expect(result.fallback).toBe(false);
    expect(result.g2pByTtsId.get("tts-1")).toBe(corrected);
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

    expect(requestCorrectionsMock).toHaveBeenCalledTimes(1);
    expect(result.fallback).toBe(true);
    expect(result.log.status).toBe("fallback");
    expect(result.log.openRouter).toMatchObject([
      {
        attempt: 1,
        chunk: 0,
        error: {
          finishReason: "length",
          usage: { completionTokens: 1024, reasoningTokens: 1024 },
          rawResponse: {
            choices: [{ finish_reason: "length", message: { content: null } }],
          },
        },
      },
    ]);
  });

  it("sends at most five targets per OpenRouter request and keeps the rest as context", async () => {
    requestCorrectionsMock.mockImplementation(async (_env, promptItems: Array<{ id: string }>) =>
      openRouterResult(
        promptItems.map((item) => ({
          id: item.id,
          changed: false,
          kana: "",
          reason: "維持",
        })),
      ),
    );

    const targets = Array.from({ length: 6 }, (_, index) =>
      target(`tts-${index + 1}`, `t${index + 1}`, "ア'"),
    );
    const pages = [
      {
        id: "page-1",
        title: "Main",
        utterances: targets.map((item) => ({
          id: item.ttsId,
          text: item.text,
          readText: item.readText,
          baselineKana: item.baseline.kana,
          target: true,
        })),
      },
    ];

    const result = await runAutomaticG2pBatch({}, { pages, targets });

    expect(requestCorrectionsMock).toHaveBeenCalledTimes(2);
    expect(requestCorrectionsMock.mock.calls[0]?.[1]).toHaveLength(5);
    expect(requestCorrectionsMock.mock.calls[1]?.[1]).toHaveLength(1);
    const firstPages = requestCorrectionsMock.mock.calls[0]?.[2]?.userContent.pages as Array<{
      utterances: Array<{ id: string; target: boolean }>;
    }>;
    expect(firstPages[0]?.utterances.filter((item) => item.target).map((item) => item.id)).toEqual([
      "tts-1",
      "tts-2",
      "tts-3",
      "tts-4",
      "tts-5",
    ]);
    expect(firstPages[0]?.utterances).toHaveLength(6);
    expect(result.log.profile).toMatchObject({ chunkSize: 5, timeoutMs: 60_000 });
    expect(result.g2pByTtsId.get("tts-6")?.kana).toBe("ア'");
  });
});
