import { describe, expect, it } from "vitest";
import { AUTOMATIC_LLM_G2P_PROFILE, MANUAL_LLM_G2P_PROFILE } from "../llm-g2p-profile";
import { requestOpenRouterCorrections } from "../openrouter";

const hasKey = Boolean(process.env.OPENROUTER_API_KEY?.trim());
const smokeEnabled = process.env.LLM_G2P_SMOKE === "1";

describe.skipIf(!hasKey || !smokeEnabled)("OpenRouter G2P smoke", () => {
  it("returns strict structured output from Gemma 4 CoreWeave fp4", async () => {
    const result = await requestOpenRouterCorrections(
      { OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY },
      [
        {
          id: "tts-1",
          text: "人気",
          readText: "人気",
          kana: "ニンキ'",
        },
      ],
      {
        profile: AUTOMATIC_LLM_G2P_PROFILE,
        userContent: {
          pages: [
            {
              id: "page-1",
              title: "Smoke",
              utterances: [
                {
                  id: "tts-1",
                  text: "人気",
                  readText: "人気",
                  baselineKana: "ニンキ'",
                  target: true,
                },
              ],
            },
          ],
        },
      },
    );

    expect(result.actualProvider?.toLowerCase()).toContain("coreweave");
    expect(result.usage.reasoningTokens).toBe(0);
    expect(result.corrections).toHaveLength(1);
    expect(result.corrections[0]?.id).toBe("tts-1");
    expect(typeof result.corrections[0]?.changed).toBe("boolean");
  }, 35_000);

  it("corrects a known misreading with Luna low", async () => {
    const result = await requestOpenRouterCorrections(
      { OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY },
      [
        {
          id: "tts-1",
          text: "人気のない人気スポット",
          readText: "人気のない人気スポット",
          kana: "ニンキ|ノ'/ナ'イ/ニンキ|スポ'ット",
          previous: { text: "人がいない場所" },
        },
      ],
      { profile: MANUAL_LLM_G2P_PROFILE },
    );

    expect(result.corrections[0]?.changed).toBe(true);
    expect(result.corrections[0]?.kana).toContain("ヒトケ");
  }, 70_000);
});
