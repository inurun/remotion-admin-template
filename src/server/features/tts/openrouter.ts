import { z } from "zod";
import type { ServerEnv } from "@/server/core/env";
import { getOpenRouterG2pSystemPrompt } from "./openrouter-prompt";

const DEFAULT_MODEL = "google/gemini-3.7-flash";
const DEFAULT_PROVIDER = "google-vertex";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const READING_PATTERN = /^[^'|/、？！_\s]+$/u;
const OPTIONAL_READING_PATTERN = /^[^'|/、？！_\s]*$/u;
const JSON_READING_PATTERN = "^[^'|/、？！_\\s]+$";
const JSON_OPTIONAL_READING_PATTERN = "^[^'|/、？！_\\s]*$";

const accentedWordSchema = z.object({
  beforeNucleus: z.string().min(1).regex(READING_PATTERN),
  afterNucleus: z.string().regex(OPTIONAL_READING_PATTERN),
});

const phraseSchema = z.object({
  leadingWords: z.array(z.string().min(1).regex(READING_PATTERN)),
  accentedWord: accentedWordSchema,
  trailingWords: z.array(z.string().min(1).regex(READING_PATTERN)),
  boundaryAfter: z.enum(["/", "、", "？", "！", ""]),
});

export const structuredCorrectionSchema = z
  .object({
    id: z.string().min(1),
    changed: z.boolean(),
    phrases: z.array(phraseSchema),
    reason: z.string(),
  })
  .superRefine((item, ctx) => {
    if (!item.changed) {
      if (item.phrases.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: "changed=false requires phrases to be empty",
          path: ["phrases"],
        });
      }
      return;
    }

    if (item.phrases.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "changed=true requires at least one phrase",
        path: ["phrases"],
      });
      return;
    }

    for (const [index, phrase] of item.phrases.entries()) {
      const isLast = index === item.phrases.length - 1;
      if (isLast && phrase.boundaryAfter === "/") {
        ctx.addIssue({
          code: "custom",
          message: 'the last phrase must not use boundaryAfter="/"',
          path: ["phrases", index, "boundaryAfter"],
        });
      }
      if (!isLast && phrase.boundaryAfter === "") {
        ctx.addIssue({
          code: "custom",
          message: "non-final phrases require a non-empty boundaryAfter",
          path: ["phrases", index, "boundaryAfter"],
        });
      }
    }
  });

const correctionSchema = z.object({ items: z.array(structuredCorrectionSchema) });

const usageSchema = z
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
  .passthrough();

const openRouterEnvelopeSchema = z
  .object({
    id: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    provider: z.string().optional(),
    choices: z
      .array(
        z
          .object({
            finish_reason: z.string().nullable().optional(),
            native_finish_reason: z.string().nullable().optional(),
            message: z
              .object({
                content: z.union([z.string(), z.null()]).optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough(),
      )
      .optional(),
    usage: usageSchema.optional(),
  })
  .passthrough();

const MIN_COMPLETION_TOKENS = 8_192;
const TOKENS_PER_ITEM = 1_024;
const MAX_COMPLETION_TOKENS = 65_536;

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
        required: ["id", "changed", "phrases", "reason"],
        properties: {
          id: { type: "string" },
          changed: { type: "boolean" },
          phrases: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["leadingWords", "accentedWord", "trailingWords", "boundaryAfter"],
              properties: {
                leadingWords: {
                  type: "array",
                  items: { type: "string", minLength: 1, pattern: JSON_READING_PATTERN },
                },
                accentedWord: {
                  type: "object",
                  additionalProperties: false,
                  required: ["beforeNucleus", "afterNucleus"],
                  properties: {
                    beforeNucleus: {
                      type: "string",
                      minLength: 1,
                      pattern: JSON_READING_PATTERN,
                    },
                    afterNucleus: { type: "string", pattern: JSON_OPTIONAL_READING_PATTERN },
                  },
                },
                trailingWords: {
                  type: "array",
                  items: { type: "string", minLength: 1, pattern: JSON_READING_PATTERN },
                },
                boundaryAfter: { type: "string", enum: ["/", "、", "？", "！", ""] },
              },
            },
          },
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

export type StructuredCorrection = z.infer<typeof structuredCorrectionSchema>;

export type OpenRouterCorrection = {
  id: string;
  changed: boolean;
  kana: string;
  reason: string;
};

export type OpenRouterUsage = {
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  costUsd: number;
};

export type ReasoningEffort = "low" | "medium";

export type OpenRouterValidationIssue = {
  path: string;
  reason: string;
  ttsId?: string;
};

export type OpenRouterRepairItem = {
  id: string;
  baselineKana: string;
  previousCorrection: StructuredCorrection | Record<string, never>;
  renderedKana: string;
  validationErrors: OpenRouterValidationIssue[];
};

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

export class OpenRouterValidationError extends Error {
  constructor(
    message: string,
    readonly requestId: string | undefined,
    readonly model: string,
    readonly provider: string | undefined,
    readonly usage: OpenRouterUsage,
    readonly validationErrors: OpenRouterValidationIssue[],
    readonly structuredOutput?: StructuredCorrection[],
    readonly renderedKana?: string[],
    readonly finishReason?: string,
  ) {
    super(message);
    this.name = "OpenRouterValidationError";
  }
}

export function getOpenRouterMaxTokens(itemCount: number) {
  return Math.min(
    MAX_COMPLETION_TOKENS,
    Math.max(MIN_COMPLETION_TOKENS, itemCount * TOKENS_PER_ITEM),
  );
}

export function getOpenRouterConfig(serverEnv: ServerEnv) {
  return {
    apiKey: serverEnv.OPENROUTER_API_KEY?.trim(),
    model: serverEnv.OPENROUTER_G2P_MODEL?.trim() || DEFAULT_MODEL,
    provider: serverEnv.OPENROUTER_G2P_PROVIDER?.trim() || DEFAULT_PROVIDER,
  };
}

export function renderCorrection(correction: StructuredCorrection): string {
  if (!correction.changed) {
    throw new Error(`changed=false cannot be rendered for TTS ${correction.id}`);
  }

  return correction.phrases
    .map((phrase) => {
      const words = [
        ...phrase.leadingWords,
        `${phrase.accentedWord.beforeNucleus}'${phrase.accentedWord.afterNucleus}`,
        ...phrase.trailingWords,
      ];
      return `${words.join("|")}${phrase.boundaryAfter}`;
    })
    .join("");
}

const ZERO_USAGE: OpenRouterUsage = {
  promptTokens: 0,
  completionTokens: 0,
  reasoningTokens: 0,
  cachedTokens: 0,
  totalTokens: 0,
  costUsd: 0,
};

function readUsage(usage: z.infer<typeof usageSchema>): OpenRouterUsage {
  return {
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? 0,
    cachedTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
    totalTokens: usage.total_tokens ?? 0,
    costUsd: usage.cost ?? 0,
  };
}

function finishReasonOf(
  choice: { finish_reason?: string | null; native_finish_reason?: string | null } | undefined,
) {
  return choice?.finish_reason ?? choice?.native_finish_reason ?? undefined;
}

function emptyContentReason(content: string | null | undefined) {
  if (content === null) return "null";
  if (content === undefined) return "missing";
  if (content.length === 0) return "empty";
  return undefined;
}

function issuePath(issue: z.ZodIssue) {
  return issue.path.map(String).join(".");
}

function toValidationErrors(error: z.ZodError, raw?: unknown): OpenRouterValidationIssue[] {
  const items =
    raw && typeof raw === "object" && raw !== null && "items" in raw && Array.isArray(raw.items)
      ? raw.items
      : [];
  return error.issues.map((issue) => {
    const itemIndex =
      issue.path[0] === "items" && typeof issue.path[1] === "number" ? issue.path[1] : undefined;
    const ttsId = itemIndex === undefined ? undefined : items[itemIndex]?.id;
    return {
      path: issuePath(issue),
      reason: issue.message,
      ttsId: typeof ttsId === "string" ? ttsId : undefined,
    };
  });
}

function mapCorrections(
  promptItems: OpenRouterPromptItem[],
  output: z.infer<typeof correctionSchema>,
) {
  const expected = new Map(promptItems.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const validationErrors: OpenRouterValidationIssue[] = [];
  const renderedKana: string[] = [];
  const corrections: OpenRouterCorrection[] = [];

  if (output.items.length !== promptItems.length) {
    throw Object.assign(new Error("item count mismatch"), {
      validationErrors: [
        {
          path: "items",
          reason: `OpenRouter returned ${output.items.length} items for ${promptItems.length} TTS`,
        },
      ] satisfies OpenRouterValidationIssue[],
    });
  }

  for (const item of output.items) {
    const baseline = expected.get(item.id);
    if (!baseline) {
      validationErrors.push({
        path: `items.${item.id}`,
        reason: `unknown TTS id: ${item.id}`,
        ttsId: item.id,
      });
      continue;
    }
    if (seen.has(item.id)) {
      validationErrors.push({
        path: `items.${item.id}`,
        reason: `duplicate TTS id: ${item.id}`,
        ttsId: item.id,
      });
      continue;
    }
    seen.add(item.id);

    if (!item.changed) {
      renderedKana.push(baseline.kana);
      corrections.push({
        id: item.id,
        changed: false,
        kana: baseline.kana,
        reason: item.reason,
      });
      continue;
    }

    try {
      const kana = renderCorrection(item);
      if (!kana) {
        validationErrors.push({
          path: `items.${item.id}.phrases`,
          reason: `empty kana for TTS ${item.id}`,
          ttsId: item.id,
        });
        continue;
      }
      renderedKana.push(kana);
      corrections.push({ id: item.id, changed: true, kana, reason: item.reason });
    } catch (error) {
      validationErrors.push({
        path: `items.${item.id}.phrases`,
        reason: error instanceof Error ? error.message : String(error),
        ttsId: item.id,
      });
    }
  }

  if (validationErrors.length > 0) {
    throw Object.assign(new Error(validationErrors.map((item) => item.reason).join(", ")), {
      validationErrors,
      structuredOutput: output.items,
      renderedKana: renderedKana.length > 0 ? renderedKana : undefined,
    });
  }

  return {
    structuredOutput: output.items,
    corrections: promptItems.map((item) => corrections.find((result) => result.id === item.id)!),
    renderedKana: promptItems.map(
      (item) => corrections.find((result) => result.id === item.id)!.kana,
    ),
  };
}

export async function requestOpenRouterCorrections(
  serverEnv: ServerEnv,
  promptItems: OpenRouterPromptItem[],
  options?: {
    reasoningEffort?: ReasoningEffort;
    repairItems?: OpenRouterRepairItem[];
  },
) {
  const config = getOpenRouterConfig(serverEnv);
  if (!config.apiKey) {
    throw new Error("OPENROUTER_API_KEY is required");
  }

  const reasoningEffort = options?.reasoningEffort ?? "low";
  const repairById = new Map((options?.repairItems ?? []).map((item) => [item.id, item]));
  const userItems = promptItems.map((item) => {
    const repair = repairById.get(item.id);
    if (!repair) return item;
    return {
      ...item,
      baselineKana: repair.baselineKana,
      previousCorrection: repair.previousCorrection,
      renderedKana: repair.renderedKana,
      validationErrors: repair.validationErrors,
    };
  });

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
        {
          role: "system",
          content: getOpenRouterG2pSystemPrompt(Boolean(options?.repairItems?.length)),
        },
        { role: "user", content: JSON.stringify({ items: userItems }) },
      ],
      reasoning: { effort: reasoningEffort, exclude: true },
      response_format: {
        type: "json_schema",
        json_schema: { name: "g2p_corrections", strict: true, schema: correctionJsonSchema },
      },
      provider: {
        only: [config.provider],
        allow_fallbacks: false,
        require_parameters: true,
      },
      max_tokens: getOpenRouterMaxTokens(promptItems.length),
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

  const envelope = openRouterEnvelopeSchema.safeParse(json);
  if (!envelope.success) {
    throw new OpenRouterValidationError(
      "OpenRouter returned an unexpected response envelope",
      undefined,
      config.model,
      undefined,
      ZERO_USAGE,
      toValidationErrors(envelope.error, json),
    );
  }

  const choice = envelope.data.choices?.[0];
  const finishReason = finishReasonOf(choice) ?? undefined;
  const usage = envelope.data.usage ? readUsage(envelope.data.usage) : ZERO_USAGE;
  const fail = (
    message: string,
    validationErrors: OpenRouterValidationIssue[],
    structuredOutput?: StructuredCorrection[],
    renderedKana?: string[],
  ) =>
    new OpenRouterValidationError(
      message,
      envelope.data.id,
      envelope.data.model ?? config.model,
      envelope.data.provider,
      usage,
      validationErrors,
      structuredOutput,
      renderedKana,
      finishReason,
    );

  const content = choice?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    const validationErrors: OpenRouterValidationIssue[] = [
      { path: "choices.0.message.content", reason: emptyContentReason(content) ?? "invalid" },
    ];
    if (finishReason) {
      validationErrors.push({ path: "choices.0.finish_reason", reason: finishReason });
    }
    throw fail("OpenRouter returned empty structured output", validationErrors);
  }

  let correctionJson: unknown;
  try {
    correctionJson = JSON.parse(content);
  } catch {
    throw fail("OpenRouter returned invalid structured output", [
      { path: "choices.0.message.content", reason: "invalid_json" },
    ]);
  }

  const parsedCorrections = correctionSchema.safeParse(correctionJson);
  if (!parsedCorrections.success) {
    throw fail(
      "OpenRouter structured output failed validation",
      toValidationErrors(parsedCorrections.error, correctionJson),
    );
  }

  try {
    const mapped = mapCorrections(promptItems, parsedCorrections.data);
    return {
      requestId: envelope.data.id,
      model: envelope.data.model ?? config.model,
      actualProvider: envelope.data.provider,
      reasoningEffort,
      finishReason,
      structuredOutput: mapped.structuredOutput,
      renderedKana: mapped.renderedKana,
      corrections: mapped.corrections,
      usage,
    };
  } catch (error) {
    const details = error as {
      validationErrors?: OpenRouterValidationIssue[];
      structuredOutput?: StructuredCorrection[];
      renderedKana?: string[];
    };
    throw fail(
      error instanceof Error ? error.message : String(error),
      details.validationErrors ?? [{ path: "items", reason: String(error) }],
      details.structuredOutput,
      details.renderedKana,
    );
  }
}
