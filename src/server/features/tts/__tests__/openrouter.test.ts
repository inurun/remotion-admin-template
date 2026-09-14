import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOpenRouterMaxTokens,
  OpenRouterValidationError,
  requestOpenRouterCorrections,
  structuredCorrectionSchema,
  type OpenRouterPromptItem,
} from "../openrouter";
import { AUTOMATIC_LLM_G2P_PROFILE, getLlmG2pMaxTokens } from "../llm-g2p-profile";

function promptItem(): OpenRouterPromptItem {
  return {
    id: "tts-1",
    text: "人気",
    readText: "人気",
    kana: "ニンキ'",
  };
}

function successResponse(items: unknown) {
  return new Response(
    JSON.stringify({
      id: "generation-1",
      model: "openai/gpt-5.6-luna",
      provider: "openai",
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

describe("structuredCorrectionSchema", () => {
  it("requires empty kana when unchanged", () => {
    expect(
      structuredCorrectionSchema.safeParse({
        id: "tts-1",
        changed: false,
        kana: "",
        reason: "維持",
      }).success,
    ).toBe(true);
    expect(
      structuredCorrectionSchema.safeParse({
        id: "tts-1",
        changed: false,
        kana: "ニンキ'",
        reason: "維持",
      }).success,
    ).toBe(false);
  });

  it("requires kana when changed and leaves DSL syntax to repair", () => {
    expect(
      structuredCorrectionSchema.safeParse({
        id: "tts-1",
        changed: true,
        kana: "",
        reason: "空",
      }).success,
    ).toBe(false);
    expect(
      structuredCorrectionSchema.safeParse({
        id: "tts-1",
        changed: true,
        kana: "ニンキ",
        reason: "核なし",
      }).success,
    ).toBe(true);
  });
});

describe("requestOpenRouterCorrections", () => {
  it("uses pinned structured output and returns usage", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      successResponse([
        {
          id: "tts-1",
          changed: true,
          kana: "ヒトケ'",
          reason: "文脈",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [
      promptItem(),
    ]);

    const request = fetchMock.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(request.headers).toMatchObject({
      Authorization: "Bearer secret",
      "HTTP-Referer": "https://github.com/inurun/remotion-admin-template",
      "X-OpenRouter-Title": "Remotion Admin",
    });
    expect(body).toMatchObject({
      model: "google/gemini-3.8-flash",
      reasoning: { effort: "low" },
      provider: {
        only: ["google-ai-studio/flex"],
        allow_fallbacks: false,
        require_parameters: true,
      },
      response_format: { type: "json_schema", json_schema: { strict: true } },
    });
    expect(result.rawResponse).toMatchObject({ id: "generation-1" });
    expect(body.max_tokens).toBe(getOpenRouterMaxTokens(1));
    expect(body.response_format.json_schema.schema.properties.items.items.required).toEqual([
      "id",
      "changed",
      "kana",
      "reason",
    ]);
    expect(body.messages[0].content).toContain("Return kana as editor DSL");
    expect(body.messages[0].content).toContain("at least one contextual reading is likely wrong");
    expect(body.messages[0].content).toContain("Do not use changed=false as a shortcut");
    expect(body.messages[0].content).toContain("same or fewer word slots than the baseline");
    expect(body.messages[0].content).toContain("Never add a word boundary that splits");
    expect(body.messages[0].content).toContain("Copy 、, ？, and ！ from the baseline kana");
    expect(body.messages[0].content).toContain("Source … and …… are already 、");
    expect(body.messages[0].content).toContain(
      "If changed is false, return kana as an empty string",
    );
    expect(body.messages[0].content).toContain("Valid word merge");
    expect(body.messages[0].content).toContain("カラ'/イ'シ becomes カラ'イ|シ");
    expect(body.messages[0].content).toContain("previous and next are neighboring utterances");
    expect(body.messages[0].content).toContain("kind=fixed is a user-specified reading");
    expect(body.messages[0].content).toContain("Do not treat contextual as an absolute lock");
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

  it("sends the automatic Gemini profile, temperature 0, and page context", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      successResponse([
        {
          id: "tts-1",
          changed: false,
          kana: "",
          reason: "維持",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [promptItem()], {
      profile: AUTOMATIC_LLM_G2P_PROFILE,
      userContent: {
        pages: [{ id: "page-1", title: "Main", utterances: [{ id: "tts-1", target: true }] }],
      },
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body));
    expect(body).toMatchObject({
      model: "google/gemini-3.8-flash",
      temperature: 0,
      reasoning: { effort: "low" },
      provider: {
        only: ["google-ai-studio/flex"],
        allow_fallbacks: false,
        require_parameters: true,
      },
    });
    expect(body.messages[0].content).toContain("The baseline reading is usually correct");
    expect(body.messages[0].content).toContain("baselineKana");
    expect(body.messages[0].content).not.toContain("baselinePhrases");
    expect(body.messages[0].content).toContain("Never return only the corrected fragment");
    expect(body.messages[0].content).toContain("アソコ|ヲ'/ダ|ヨ'ー|ネ");
    expect(body.messages[0].content).toContain("kind=fixed is a user-specified reading");
    expect(body.messages[0].content).not.toContain(
      "at least one contextual reading is likely wrong",
    );
    expect(JSON.parse(body.messages[1].content).pages[0].id).toBe("page-1");
    expect(body.max_tokens).toBe(getLlmG2pMaxTokens(AUTOMATIC_LLM_G2P_PROFILE, 1));
  });

  it("uses the baseline when changed is false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        successResponse([
          {
            id: "tts-1",
            changed: false,
            kana: "",
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

  it("forwards neighboring TTS as context-only input", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      successResponse([
        {
          id: "tts-1",
          changed: false,
          kana: "",
          reason: "維持",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [
      {
        ...promptItem(),
        previous: { text: "前" },
        next: { text: "次", readText: "つぎ" },
      },
    ]);

    const body = JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body));
    const items = JSON.parse(body.messages[1].content).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "tts-1",
      previous: { text: "前" },
      next: { text: "次", readText: "つぎ" },
    });
  });

  it("sends the repair prompt and repair items as the user payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      successResponse([
        {
          id: "tts-1",
          changed: true,
          kana: "ヒトケ'",
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
          text: "人気",
          readText: "人気",
          baselineKana: "ニンキ'",
          previousKana: "ヒトケ",
          errors: [{ kind: "syntax", message: "missing accent nucleus" }],
        },
      ],
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body));
    expect(body.reasoning.effort).toBe("medium");
    expect(body.messages[0].content).toContain(
      "The previous correction failed syntax, topology, or Validate.",
    );
    expect(body.messages[0].content).toContain("indexes refer to baselineKana, never previousKana");
    const userInput = JSON.parse(body.messages[1].content);
    expect(userInput.items[0]).toEqual({
      id: "tts-1",
      text: "人気",
      readText: "人気",
      baselineKana: "ニンキ'",
      previousKana: "ヒトケ",
      errors: [{ kind: "syntax", message: "missing accent nucleus" }],
    });
  });

  it("applies the repair prompt for automatic retries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      successResponse([
        {
          id: "tts-1",
          changed: true,
          kana: "ヒトケ'",
          reason: "修復",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [promptItem()], {
      profile: AUTOMATIC_LLM_G2P_PROFILE,
      repairItems: [
        {
          id: "tts-1",
          text: "人気",
          readText: "人気",
          baselineKana: "ニンキ'",
          previousKana: "ヒトケ",
          errors: [{ kind: "syntax", message: "missing accent nucleus" }],
        },
      ],
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body));
    expect(body.messages[0].content).toContain("Keep the intended reading correction");
    expect(JSON.parse(body.messages[1].content).pages).toBeUndefined();
  });

  it("requires an API key", async () => {
    await expect(requestOpenRouterCorrections({}, [promptItem()])).rejects.toThrow(
      "OPENROUTER_API_KEY is required",
    );
  });

  it("returns invalid DSL so analysis can repair it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        successResponse([
          {
            id: "tts-1",
            changed: true,
            kana: "ホ'_ー",
            reason: "文脈",
          },
        ]),
      ),
    );

    const result = await requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [
      promptItem(),
    ]);
    expect(result.corrections[0]?.kana).toBe("ホ'_ー");
  });

  it("rejects malformed item sets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        successResponse([
          {
            id: "other",
            changed: true,
            kana: "ヒトケ'",
            reason: "文脈",
          },
        ]),
      ),
    );
    await expect(
      requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [promptItem()]),
    ).rejects.toThrow("unknown TTS id");
  });

  it("keeps valid automatic items when another id is unknown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        successResponse([
          {
            id: "other",
            changed: true,
            kana: "ヒトケ'",
            reason: "文脈",
          },
          {
            id: "tts-1",
            changed: false,
            kana: "",
            reason: "維持",
          },
        ]),
      ),
    );

    const result = await requestOpenRouterCorrections(
      { OPENROUTER_API_KEY: "secret" },
      [promptItem()],
      { profile: AUTOMATIC_LLM_G2P_PROFILE },
    );

    expect(result.corrections).toEqual([
      { id: "tts-1", changed: false, kana: "ニンキ'", reason: "維持" },
    ]);
    expect(result.partialErrors).toEqual([
      { path: "items.other", reason: "unknown TTS id: other", ttsId: "other" },
    ]);
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

  it("keeps the raw body when the envelope is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{not json", { status: 200 })));

    await expect(
      requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [promptItem()]),
    ).rejects.toMatchObject({
      status: 200,
      responseBody: "{not json",
      message: expect.stringContaining("invalid JSON"),
    });
  });

  it("wraps null content as a retryable validation error and keeps usage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "generation-1",
            model: "openai/gpt-5.6-luna",
            provider: "openai",
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
      model: "openai/gpt-5.6-luna",
      provider: "openai",
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
    expect(error.rawResponse).toMatchObject({
      id: "generation-1",
      choices: [{ finish_reason: "length", message: { content: null } }],
    });
  });

  it("scales max_tokens with the number of items", () => {
    expect(getOpenRouterMaxTokens(1)).toBe(4096);
    expect(getOpenRouterMaxTokens(20)).toBe(10_240);
    expect(getOpenRouterMaxTokens(256)).toBe(32_768);
    expect(getLlmG2pMaxTokens(AUTOMATIC_LLM_G2P_PROFILE, 1)).toBe(8192);
    expect(getLlmG2pMaxTokens(AUTOMATIC_LLM_G2P_PROFILE, 20)).toBe(10_240);
    expect(getLlmG2pMaxTokens(AUTOMATIC_LLM_G2P_PROFILE, 256)).toBe(32_768);
  });
});
