import { z } from "zod";
import type { ServerEnv } from "@/server/core/env";

const DEFAULT_MODEL = "google/gemini-3.7-flash";
const DEFAULT_PROVIDER = "google-vertex";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const correctionItemSchema = z.object({
  id: z.string().min(1),
  changed: z.boolean(),
  kana: z.string().min(1),
  reason: z.string(),
});

const correctionSchema = z.object({ items: z.array(correctionItemSchema) });

const openRouterResponseSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  provider: z.string().optional(),
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string() }).passthrough(),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().nonnegative().optional(),
      completion_tokens: z.number().nonnegative().optional(),
      total_tokens: z.number().nonnegative().optional(),
      cost: z.number().nonnegative().optional(),
      completion_tokens_details: z
        .object({ reasoning_tokens: z.number().nonnegative().optional() })
        .optional(),
      prompt_tokens_details: z
        .object({ cached_tokens: z.number().nonnegative().optional() })
        .optional(),
    })
    .passthrough(),
});

const correctionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "changed", "kana", "reason"],
        properties: {
          id: { type: "string" },
          changed: { type: "boolean" },
          kana: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
} as const;

export type OpenRouterPromptItem = {
  id: string;
  text: string;
  readText: string;
  kana: string;
};

export type OpenRouterCorrection = z.infer<typeof correctionItemSchema>;

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly responseBody?: string,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export function getOpenRouterConfig(serverEnv: ServerEnv) {
  return {
    apiKey: serverEnv.OPENROUTER_API_KEY?.trim(),
    model: serverEnv.OPENROUTER_G2P_MODEL?.trim() || DEFAULT_MODEL,
    provider: serverEnv.OPENROUTER_G2P_PROVIDER?.trim() || DEFAULT_PROVIDER,
  };
}

function validateCorrections(
  promptItems: OpenRouterPromptItem[],
  output: z.infer<typeof correctionSchema>,
) {
  const expected = new Map(promptItems.map((item) => [item.id, item]));
  const seen = new Set<string>();

  if (output.items.length !== promptItems.length) {
    throw new Error(
      `OpenRouter returned ${output.items.length} items for ${promptItems.length} TTS`,
    );
  }

  for (const item of output.items) {
    if (!expected.has(item.id)) throw new Error(`OpenRouter returned unknown TTS id: ${item.id}`);
    if (seen.has(item.id)) throw new Error(`OpenRouter returned duplicate TTS id: ${item.id}`);
    seen.add(item.id);
    item.kana = item.kana.trim().replaceAll("_", "");
    if (!item.kana) throw new Error(`OpenRouter returned an empty kana for TTS ${item.id}`);
  }

  return promptItems.map((item) => output.items.find((result) => result.id === item.id)!);
}

const SYSTEM_PROMPT = [
  "You proofread Japanese TTS readings as extended AquesTalk-like kana.",
  "Use every item on the page as context.",
  "Return one kana string per item.",
  "Do not add, delete, or paraphrase the source text.",
  "Word slots are separated by |, /, 、, ？, ！, or the string boundaries.",
  "Output may contain the same or fewer word slots than the baseline, in source order.",
  "You may change readings, replace | with / or / with |, and remove | or / to merge adjacent baseline word slots.",
  "Never add a word boundary that splits one baseline word slot into multiple output slots.",
  "Preserve 、, ？, and ！ exactly; never add, remove, move, or replace them.",
  "Accent phrases end at /, 、, ？, ！, or the end of the string.",
  "The | symbol is only a word boundary; it NEVER ends an accent phrase.",
  "Every non-empty accent phrase must contain exactly one ' after a mora.",
  "Count ' across the entire interval between /, 、, ？, ！, or string boundaries, ignoring every |; the count must be exactly one.",
  "Invalid: テ'スト|ナ|ノ|ダ' has two nuclei. Invalid: ジュンカイ|ホーモン|シ|テ|イル has zero nuclei. Valid: ジョ'ーズ|ナ has one nucleus.",
  "You may move ' inside the resulting accent phrase.",
  "These separator and accent rules are hard grammar constraints, not suggestions.",
  "Before returning each item, verify that its word slot count does not exceed the baseline, its 、/？/！ sequence is unchanged, and every non-empty accent phrase contains exactly one '.",
  "If any check fails, return the baseline kana unchanged with changed=false.",
  "Valid phrase merge: カラ'/イ'シ -> カラ'イ|シ.",
  "Valid word merge: ウワテ'/ナゲ' -> ウワテナゲ'.",
  "Valid example: ニンキ|ノ'/ナ'イ/ニンキ|スポ'ット -> ヒトケ|ノ'/ナ'イ/ニンキ|スポ'ット.",
  "Do not output _.",
  "If uncertain, keep the baseline kana and set changed=false.",
  "reason must be brief Japanese.",
  "Return only the JSON schema output.",
].join(" ");

export async function requestOpenRouterCorrections(
  serverEnv: ServerEnv,
  promptItems: OpenRouterPromptItem[],
) {
  const config = getOpenRouterConfig(serverEnv);
  if (!config.apiKey) {
    throw new Error("OPENROUTER_API_KEY is required");
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "X-OpenRouter-Title": "Remotion Admin G2P Lab",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ items: promptItems }) },
      ],
      reasoning: { effort: "low", exclude: true },
      response_format: {
        type: "json_schema",
        json_schema: { name: "g2p_corrections", strict: true, schema: correctionJsonSchema },
      },
      provider: {
        only: [config.provider],
        allow_fallbacks: false,
        require_parameters: true,
      },
      max_tokens: 4096,
      stream: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new OpenRouterError(
      `OpenRouter request failed: HTTP ${response.status}${responseBody ? ` ${responseBody}` : ""}`,
      response.status,
      responseBody,
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new OpenRouterError("OpenRouter returned invalid JSON", response.status);
  }

  const parsed = openRouterResponseSchema.parse(json);
  const content = parsed.choices[0]!.message.content;
  let correctionJson: unknown;
  try {
    correctionJson = JSON.parse(content);
  } catch {
    throw new OpenRouterError(
      "OpenRouter returned invalid structured output",
      response.status,
      content,
    );
  }
  const corrections = validateCorrections(promptItems, correctionSchema.parse(correctionJson));

  return {
    requestId: parsed.id,
    model: parsed.model,
    actualProvider: parsed.provider,
    corrections,
    usage: {
      promptTokens: parsed.usage.prompt_tokens ?? 0,
      completionTokens: parsed.usage.completion_tokens ?? 0,
      reasoningTokens: parsed.usage.completion_tokens_details?.reasoning_tokens ?? 0,
      cachedTokens: parsed.usage.prompt_tokens_details?.cached_tokens ?? 0,
      totalTokens: parsed.usage.total_tokens ?? 0,
      costUsd: parsed.usage.cost ?? 0,
    },
  };
}
