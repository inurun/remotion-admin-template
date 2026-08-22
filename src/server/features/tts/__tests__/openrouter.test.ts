import { afterEach, describe, expect, it, vi } from "vitest";
import { requestOpenRouterCorrections, type OpenRouterPromptItem } from "../openrouter";

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
    expect(body.response_format.json_schema.schema.properties.items.items.required).toEqual([
      "id",
      "changed",
      "kana",
      "reason",
    ]);
    expect(body.messages[0].content).toContain("Do not output _.");
    expect(body.messages[0].content).toContain("same or fewer word slots than the baseline");
    expect(body.messages[0].content).toContain(
      "Every non-empty accent phrase must contain exactly one '",
    );
    expect(body.messages[0].content).toContain("| symbol is only a word boundary");
    expect(body.messages[0].content).toContain("ignoring every |");
    expect(body.messages[0].content).toContain("remove | or / to merge adjacent");
    expect(body.messages[0].content).toContain("Never add a word boundary that splits");
    expect(body.messages[0].content).toContain("Preserve 、, ？, and ！ exactly");
    expect(body.messages[0].content).toContain("If any check fails, return the baseline kana");
    expect(body.messages[0].content).toContain("Valid word merge");
    expect(result.usage).toEqual({
      promptTokens: 100,
      completionTokens: 20,
      reasoningTokens: 8,
      cachedTokens: 12,
      totalTokens: 120,
      costUsd: 0.001,
    });
  });

  it("requires an API key", async () => {
    await expect(requestOpenRouterCorrections({}, [promptItem()])).rejects.toThrow(
      "OPENROUTER_API_KEY is required",
    );
  });

  it("removes unsupported devoicing markers", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          successResponse([{ id: "tts-1", changed: true, kana: "ホ'_ー", reason: "文脈" }]),
        ),
    );

    const result = await requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [
      promptItem(),
    ]);

    expect(result.corrections[0]?.kana).toBe("ホ'ー");
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

  it("keeps provider HTTP details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })),
    );
    await expect(
      requestOpenRouterCorrections({ OPENROUTER_API_KEY: "secret" }, [promptItem()]),
    ).rejects.toMatchObject({ status: 429, responseBody: "rate limited" });
  });
});
