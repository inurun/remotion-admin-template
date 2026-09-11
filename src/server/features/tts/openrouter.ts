import { z } from "zod";
import type { ServerEnv } from "@/server/core/env";
import type { CorrectionError } from "@/server/features/tts/g2p-topology";
import {
  getLlmG2pMaxTokens,
  MANUAL_LLM_G2P_PROFILE,
  type LlmG2pProfile,
} from "@/server/features/tts/llm-g2p-profile";
import { getOpenRouterG2pSystemPrompt } from "./openrouter-prompt";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const structuredCorrectionSchema = z
  .object({
    id: z.string().min(1),
    changed: z.boolean(),
    kana: z.string(),
    reason: z.string(),
  })
  .superRefine((item, ctx) => {
    if (!item.changed) {
      if (item.kana.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: "changed=false requires kana to be empty",
          path: ["kana"],
        });
      }
      return;
    }

    if (!item.kana) {
      ctx.addIssue({
        code: "custom",
        message: "changed=true requires kana",
        path: ["kana"],
      });
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

export type OpenRouterNeighborItem = {
  text: string;
  readText?: string;
};

export type OpenRouterPromptItem = {
  id: string;
  text: string;
  readText: string;
  kana: string;
  previous?: OpenRouterNeighborItem;
  next?: OpenRouterNeighborItem;
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

export type ReasoningEffort = "none" | "low" | "medium";

export type OpenRouterValidationIssue = {
  path: string;
  reason: string;
  ttsId?: string;
};

export type OpenRouterRepairItem = {
  id: string;
  text: string;
  readText: string;
  baselineKana: string;
  previousKana: string;
  errors: CorrectionError[];
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
    readonly rawResponse?: unknown,
  ) {
    super(message);
    this.name = "OpenRouterValidationError";
  }
}

export function getOpenRouterMaxTokens(itemCount: number) {
  return getLlmG2pMaxTokens(MANUAL_LLM_G2P_PROFILE, itemCount);
}

export function getOpenRouterConfig(serverEnv: ServerEnv) {
  return {
    apiKey: serverEnv.OPENROUTER_API_KEY?.trim(),
  };
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

function parseCorrectionItems(correctionJson: unknown, allowPartial: boolean) {
  const parsed = correctionSchema.safeParse(correctionJson);
  if (parsed.success) {
    return { items: parsed.data.items };
  }
  if (!allowPartial) {
    return { error: parsed.error };
  }

  const rawItems =
    correctionJson &&
    typeof correctionJson === "object" &&
    "items" in correctionJson &&
    Array.isArray((correctionJson as { items: unknown }).items)
      ? (correctionJson as { items: unknown[] }).items
      : [];
  const items: StructuredCorrection[] = [];
  const parseErrors: OpenRouterValidationIssue[] = [];
  for (const [index, item] of rawItems.entries()) {
    const one = structuredCorrectionSchema.safeParse(item);
    if (one.success) {
      items.push(one.data);
      continue;
    }
    parseErrors.push(
      ...toValidationErrors(one.error, { items: [item] }).map((issue) => ({
        ...issue,
        path: `items.${index}${issue.path ? `.${issue.path}` : ""}`,
        ttsId:
          typeof (item as { id?: unknown })?.id === "string"
            ? (item as { id: string }).id
            : issue.ttsId,
      })),
    );
  }

  return { items, parseErrors };
}

function mapCorrections(
  promptItems: OpenRouterPromptItem[],
  output: z.infer<typeof correctionSchema>,
  allowPartial = false,
) {
  const expected = new Map(promptItems.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const validationErrors: OpenRouterValidationIssue[] = [];
  const correctionsById = new Map<string, OpenRouterCorrection>();

  if (!allowPartial && output.items.length !== promptItems.length) {
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
      correctionsById.set(item.id, {
        id: item.id,
        changed: false,
        kana: baseline.kana,
        reason: item.reason,
      });
      continue;
    }

    correctionsById.set(item.id, {
      id: item.id,
      changed: true,
      kana: item.kana,
      reason: item.reason,
    });
  }

  if (!allowPartial && validationErrors.length > 0) {
    throw Object.assign(new Error(validationErrors.map((item) => item.reason).join(", ")), {
      validationErrors,
      structuredOutput: output.items,
      renderedKana: promptItems.flatMap((item) => {
        const correction = correctionsById.get(item.id);
        return correction ? [correction.kana] : [];
      }),
    });
  }

  const corrections = promptItems.map((item) => {
    const mapped = correctionsById.get(item.id);
    if (mapped) {
      return mapped;
    }
    return {
      id: item.id,
      changed: false,
      kana: item.kana,
      reason: "",
    };
  });

  return {
    structuredOutput: output.items.filter((item) => expected.has(item.id)),
    corrections,
    renderedKana: corrections.map((item) => item.kana),
    partialErrors: allowPartial && validationErrors.length > 0 ? validationErrors : undefined,
  };
}

export async function requestOpenRouterCorrections(
  serverEnv: ServerEnv,
  promptItems: OpenRouterPromptItem[],
  options?: {
    profile?: LlmG2pProfile;
    reasoningEffort?: ReasoningEffort;
    repairItems?: OpenRouterRepairItem[];
    userContent?: unknown;
  },
) {
  const config = getOpenRouterConfig(serverEnv);
  if (!config.apiKey) {
    throw new Error("OPENROUTER_API_KEY is required");
  }

  const profile = options?.profile ?? MANUAL_LLM_G2P_PROFILE;
  const reasoningEffort = options?.reasoningEffort ?? profile.reasoningEffort;
  const repairItems = options?.repairItems ?? [];
  const userContent =
    repairItems.length > 0
      ? { items: repairItems }
      : (options?.userContent ?? { items: promptItems });
  const quantizations =
    "quantizations" in profile.provider ? profile.provider.quantizations : undefined;
  const provider = {
    only: [...profile.provider.only],
    allow_fallbacks: profile.provider.allowFallbacks,
    require_parameters: profile.provider.requireParameters,
    ...(quantizations ? { quantizations: [...quantizations] } : {}),
  };

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "X-OpenRouter-Title": "Remotion Admin G2P Lab",
    },
    body: JSON.stringify({
      model: profile.model,
      messages: [
        {
          role: "system",
          content: getOpenRouterG2pSystemPrompt({
            mode: profile.mode,
            repair: Boolean(options?.repairItems?.length),
          }),
        },
        { role: "user", content: JSON.stringify(userContent) },
      ],
      reasoning: { effort: reasoningEffort },
      ...(profile.mode === "automatic" ? { temperature: 0 } : {}),
      response_format: {
        type: "json_schema",
        json_schema: { name: "g2p_corrections", strict: true, schema: correctionJsonSchema },
      },
      provider,
      max_tokens: getLlmG2pMaxTokens(profile, promptItems.length),
      stream: false,
    }),
    signal: AbortSignal.timeout(profile.timeoutMs),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    throw new OpenRouterError(
      `OpenRouter request failed: HTTP ${response.status}${responseBody ? ` ${responseBody}` : ""}`,
      response.status,
      responseBody,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(responseBody);
  } catch (error) {
    throw new OpenRouterError(
      `OpenRouter returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      response.status,
      responseBody,
    );
  }

  const envelope = openRouterEnvelopeSchema.safeParse(json);
  if (!envelope.success) {
    throw new OpenRouterValidationError(
      "OpenRouter returned an unexpected response envelope",
      undefined,
      profile.model,
      undefined,
      ZERO_USAGE,
      toValidationErrors(envelope.error, json),
      undefined,
      undefined,
      undefined,
      json,
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
      envelope.data.model ?? profile.model,
      envelope.data.provider,
      usage,
      validationErrors,
      structuredOutput,
      renderedKana,
      finishReason,
      json,
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

  const parsedCorrections = parseCorrectionItems(correctionJson, profile.mode === "automatic");
  if ("error" in parsedCorrections && parsedCorrections.error) {
    throw fail(
      "OpenRouter structured output failed validation",
      toValidationErrors(parsedCorrections.error, correctionJson),
    );
  }

  try {
    const mapped = mapCorrections(
      promptItems,
      { items: parsedCorrections.items ?? [] },
      profile.mode === "automatic",
    );
    const partialErrors = [
      ...(parsedCorrections.parseErrors ?? []),
      ...(mapped.partialErrors ?? []),
    ];
    return {
      requestId: envelope.data.id,
      model: envelope.data.model ?? profile.model,
      actualProvider: envelope.data.provider,
      reasoningEffort,
      finishReason,
      structuredOutput: mapped.structuredOutput,
      renderedKana: mapped.renderedKana,
      corrections: mapped.corrections,
      usage,
      rawResponse: json,
      ...(partialErrors.length > 0 ? { partialErrors } : {}),
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
