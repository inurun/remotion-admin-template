import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOpenRouterMaxTokens,
  OpenRouterValidationError,
  renderCorrection,
  requestOpenRouterCorrections,
  structuredCorrectionSchema,
  type OpenRouterPromptItem,
  type StructuredCorrection,
} from "../openrouter";

function promptItem(): OpenRouterPromptItem {
  return {
    id: "tts-1",
    text: "人気",
    readText: "人気",
    kana: "ニンキ'",
  };
}

function phrase(
  partial?: Partial<StructuredCorrection["phrases"][number]>,
): StructuredCorrection["phrases"][number] {
  return {
    leadingWords: [],
    accentedWord: { beforeNucleus: "ヒトケ", afterNucleus: "" },
    trailingWords: [],
    boundaryAfter: "",
    ...partial,
  };
}

function successResponse(items: unknown) {
  return new Response(
    JSON.stringify({
      id: "generation-1",
      model: "google/gemini-3.7-flash",
      provider: "google-vertex",
      choices: [{ message: { content: JSON.stringify({ items }) } }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 20,
        total_tokens: 120,
        cost: 0.001,
        completion_tokens_details: { reasoning_tokens: 8 },
        prompt_tokens_details: { cached_tokens: 12 },
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("renderCorrection", () => {
  it("renders structured phrases into DSL", () => {
    const kana = renderCorrection({
      id: "tts-1",
      changed: true,
      phrases: [
        {
          leadingWords: ["カラダ"],
          accentedWord: { beforeNucleus: "ノ", afterNucleus: "" },
          trailingWords: [],
          boundaryAfter: "/",
        },
        {
          leadingWords: [],
          accentedWord: { beforeNucleus: "タイセー", afterNucleus: "" },
          trailingWords: ["ヲ"],
          boundaryAfter: "",
        },
      ],
      reason: "「体」をカラダへ修正",
    });

    expect(kana).toBe("カラダ|ノ'/タイセー'|ヲ");
  });

  it("keeps a nucleus in every phrase for 体/体勢", () => {
    const kana = renderCorrection({
      id: "tts-1",
      changed: true,
      phrases: [
        {
          leadingWords: ["キホン"],
          accentedWord: { beforeNucleus: "ワ", afterNucleus: "" },
          trailingWords: [],
          boundaryAfter: "/",
        },
        {
          leadingWords: [],
          accentedWord: { beforeNucleus: "コノ", afterNucleus: "" },
          trailingWords: [],
          boundaryAfter: "/",
        },
        {
          leadingWords: [],
          accentedWord: { beforeNucleus: "カラダ", afterNucleus: "" },
          trailingWords: ["デ"],
          boundaryAfter: "/",
        },
        {
          leadingWords: ["カラダ"],
          accentedWord: { beforeNucleus: "ノ", afterNucleus: "" },
          trailingWords: [],
          boundaryAfter: "/",
        },
        {
          leadingWords: [],
          accentedWord: { beforeNucleus: "タイセー", afterNucleus: "" },
          trailingWords: ["ヲ"],
          boundaryAfter: "/",
        },
        {
          leadingWords: [],
          accentedWord: { beforeNucleus: "タモ", afterNucleus: "ッ" },
          trailingWords: ["テ", "クダサイ"],
          boundaryAfter: "",
        },
      ],
      reason: "体をカラダ、体勢をタイセーへ修正",
    });

    expect(kana).toBe("キホン|ワ'/コノ'/カラダ'|デ/カラダ|ノ'/タイセー'|ヲ/タモ'ッ|テ|クダサイ");
    const phrases = kana.split(/[/、？！]/u).filter(Boolean);
    expect(phrases.every((item) => item.split("'").length === 2)).toBe(true);
  });
});

describe("structuredCorrectionSchema", () => {
  it("rejects a phrase without a nucleus", () => {
    const result = structuredCorrectionSchema.safeParse({
      id: "tts-1",
      changed: true,
      phrases: [
        {
          leadingWords: ["ヒトケ"],
          trailingWords: [],
          boundaryAfter: "",
        },
      ],
      reason: "核なし",
    });

    expect(result.success).toBe(false);
  });

  it("rejects ' and / in reading fields", () => {
    expect(
      structuredCorrectionSchema.safeParse({
        id: "tts-1",
        changed: true,
        phrases: [phrase({ accentedWord: { beforeNucleus: "ヒト'ケ", afterNucleus: "" } })],
        reason: "核記号",
      }).success,
    ).toBe(false);
    expect(
      structuredCorrectionSchema.safeParse({
        id: "tts-1",
        changed: true,
        phrases: [phrase({ leadingWords: ["ニンキ/"] })],
        reason: "句境界",
      }).success,
    ).toBe(false);
  });

  it("rejects empty beforeNucleus", () => {
    expect(
      structuredCorrectionSchema.safeParse({
        id: "tts-1",
        changed: true,
        phrases: [phrase({ accentedWord: { beforeNucleus: "", afterNucleus: "ヒトケ" } })],
        reason: "核前が空",
      }).success,
    ).toBe(false);
  });

  it("allows final punctuation but rejects a final slash", () => {
    expect(
      structuredCorrectionSchema.safeParse({
        id: "tts-1",
        changed: true,
        phrases: [phrase({ boundaryAfter: "！" })],
        reason: "感嘆",
      }).success,
    ).toBe(true);
    expect(
      structuredCorrectionSchema.safeParse({
        id: "tts-1",
        changed: true,
        phrases: [phrase({ boundaryAfter: "/" })],
        reason: "不正な終端",
      }).success,
    ).toBe(false);
  });
});

describe("requestOpenRouterCorrections", () => {
  it("uses pinned structured output and returns usage", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      successResponse([
        {
          id: "tts-1",
          changed: true,
          phrases: [phrase()],
          reason: "文脈",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestOpenRouterCorrections(
      {
        OPENROUTER_API_KEY: "secret",
        OPENROUTER_G2P_MODEL: "model/test",
        OPENROUTER_G2P_PROVIDER: "provider-test",
      },
      [promptItem()],
    );

    const request = fetchMock.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(request.headers).toMatchObject({ Authorization: "Bearer secret" });
    expect(body).toMatchObject({
      model: "model/test",
      reasoning: { effort: "low", exclude: true },
      provider: {
        only: ["provider-test"],
        allow_fallbacks: false,
        require_parameters: true,
      },
      response_format: { type: "json_schema", json_schema: { strict: true } },
    });
    expect(body.max_tokens).toBe(getOpenRouterMaxTokens(1));
    expect(body.response_format.json_schema.schema.properties.items.items.required).toEqual([
      "id",
      "changed",
      "phrases",
      "reason",
    ]);
    expect(body.messages[0].content).toContain("Do not emit kana DSL");
    expect(body.messages[0].content).toContain("at least one contextual reading is likely wrong");
    expect(body.messages[0].content).toContain("Do not use changed=false as a shortcut");
    expect(body.messages[0].content).toContain("same or fewer word slots than the baseline");
    expect(body.messages[0].content).toContain("Never add a word boundary that splits");
    expect(body.messages[0].content).toContain("Preserve 、, ？, and ！ exactly");
    expect(body.messages[0].content).toContain("If changed is false, return phrases as []");
    expect(body.messages[0].content).toContain("Valid word merge");
    expect(JSON.parse(body.messages[1].content).items[0].kana).toBe("ニンキ'");
    expect(result.corrections[0]?.kana).toBe("ヒトケ'");
    expect(result.usage).toEqual({
      promptTokens: 100,
      completionTokens: 20,
      reasoningTokens: 8,
      cachedTokens: 12,
      totalTokens: 120,
      costUsd: 0.001,
    });
  });

  it("uses the baseline when changed is false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        successResponse([
          {
            id: "tts-1",
            changed: false,
            phrases: [],
            reason: "維持",
          },
        ]),
      ),
    );

    const result = await requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [
      promptItem(),
    ]);

    expect(result.corrections[0]).toMatchObject({
      changed: false,
      kana: "ニンキ'",
      reason: "維持",
    });
  });

  it("sends the repair prompt and medium effort on retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      successResponse([
        {
          id: "tts-1",
          changed: true,
          phrases: [phrase()],
          reason: "修復",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [promptItem()], {
      reasoningEffort: "medium",
      repairItems: [
        {
          id: "tts-1",
          baselineKana: "ニンキ'",
          previousCorrection: {
            id: "tts-1",
            changed: true,
            phrases: [phrase({ accentedWord: { beforeNucleus: "ヒトケ", afterNucleus: "" } })],
            reason: "前回",
          },
          renderedKana: "ヒトケ'",
          validationErrors: [
            { path: "items[0].kana", reason: "invalid_accent_nucleus", ttsId: "tts-1" },
          ],
        },
      ],
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body));
    expect(body.reasoning.effort).toBe("medium");
    expect(body.messages[0].content).toContain("The previous correction failed validation.");
    const userInput = JSON.parse(body.messages[1].content);
    expect(userInput.items[0].kana).toBe("ニンキ'");
    expect(userInput.items[0].baselineKana).toBe("ニンキ'");
    expect(userInput.items[0].renderedKana).toBe("ヒトケ'");
    expect(userInput.items[0].previousCorrection).toBeDefined();
    expect(userInput.items[0].validationErrors[0].reason).toBe("invalid_accent_nucleus");
  });

  it("requires an API key", async () => {
    await expect(requestOpenRouterCorrections({}, [promptItem()])).rejects.toThrow(
      "OPENROUTER_API_KEY is required",
    );
  });

  it("rejects unsupported markers instead of stripping them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        successResponse([
          {
            id: "tts-1",
            changed: true,
            phrases: [phrase({ accentedWord: { beforeNucleus: "ホ", afterNucleus: "_ー" } })],
            reason: "文脈",
          },
        ]),
      ),
    );

    await expect(
      requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [promptItem()]),
    ).rejects.toBeInstanceOf(OpenRouterValidationError);
  });

  it("rejects malformed item sets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        successResponse([
          {
            id: "other",
            changed: true,
            phrases: [phrase()],
            reason: "文脈",
          },
        ]),
      ),
    );
    await expect(
      requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [promptItem()]),
    ).rejects.toThrow("unknown TTS id");
  });

  it("keeps provider HTTP details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })),
    );
    await expect(
      requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [promptItem()]),
    ).rejects.toMatchObject({ status: 429, responseBody: "rate limited" });
  });

  it("wraps null content as a retryable validation error and keeps usage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "generation-1",
            model: "google/gemini-3.7-flash",
            provider: "google-vertex",
            choices: [{ finish_reason: "length", message: { content: null } }],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 4096,
              total_tokens: 4196,
              cost: 0.002,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const error = await requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [
      promptItem(),
    ]).catch((caught) => caught);

    expect(error).toBeInstanceOf(OpenRouterValidationError);
    expect(error).toMatchObject({
      requestId: "generation-1",
      model: "google/gemini-3.7-flash",
      provider: "google-vertex",
      finishReason: "length",
      usage: {
        promptTokens: 100,
        completionTokens: 4096,
        totalTokens: 4196,
        costUsd: 0.002,
      },
    });
    expect(error.validationErrors).toEqual([
      { path: "choices.0.message.content", reason: "null" },
      { path: "choices.0.finish_reason", reason: "length" },
    ]);
  });

  it("scales max_tokens with the number of items", () => {
    expect(getOpenRouterMaxTokens(1)).toBe(8192);
    expect(getOpenRouterMaxTokens(20)).toBe(20_480);
    expect(getOpenRouterMaxTokens(256)).toBe(65_536);
  });
});
