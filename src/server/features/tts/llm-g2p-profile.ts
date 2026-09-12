export type LlmG2pProfile = {
  id: string;
  mode: "automatic" | "manual";
  model: string;
  provider: {
    only: string[];
    quantizations?: string[];
    allowFallbacks: false;
    requireParameters: true;
  };
  reasoningEffort: "none" | "low";
  timeoutMs: number;
  maxAttempts: 1 | 2;
  chunkSize: number;
};

export const AUTOMATIC_LLM_G2P_PROFILE = {
  id: "gemini-3.8-flash",
  mode: "automatic",
  model: "google/gemini-3.8-flash",
  provider: {
    only: ["google-ai-studio/flex"],
    allowFallbacks: false,
    requireParameters: true,
  },
  reasoningEffort: "low",
  timeoutMs: 60_000,
  maxAttempts: 2,
  chunkSize: 5,
} as const satisfies LlmG2pProfile;

export const MANUAL_LLM_G2P_PROFILE = {
  id: "gemini-3.8-flash",
  mode: "manual",
  model: "google/gemini-3.8-flash",
  provider: {
    only: ["google-ai-studio/flex"],
    allowFallbacks: false,
    requireParameters: true,
  },
  reasoningEffort: "low",
  timeoutMs: 60_000,
  maxAttempts: 2,
  chunkSize: 5,
} as const satisfies LlmG2pProfile;

const AUTOMATIC_MIN_COMPLETION_TOKENS = 8_192;
const AUTOMATIC_TOKENS_PER_ITEM = 512;
const AUTOMATIC_MAX_COMPLETION_TOKENS = 32_768;
const MANUAL_MIN_COMPLETION_TOKENS = 4_096;
const MANUAL_TOKENS_PER_ITEM = 512;
const MANUAL_MAX_COMPLETION_TOKENS = 32_768;

export function chunkItems<T>(items: readonly T[], chunkSize: number) {
  const size = Math.max(1, chunkSize);
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function getLlmG2pMaxTokens(profile: LlmG2pProfile, itemCount: number) {
  if (profile.mode === "automatic") {
    return Math.min(
      AUTOMATIC_MAX_COMPLETION_TOKENS,
      Math.max(AUTOMATIC_MIN_COMPLETION_TOKENS, itemCount * AUTOMATIC_TOKENS_PER_ITEM),
    );
  }

  return Math.min(
    MANUAL_MAX_COMPLETION_TOKENS,
    Math.max(MANUAL_MIN_COMPLETION_TOKENS, itemCount * MANUAL_TOKENS_PER_ITEM),
  );
}

export function hasOpenRouterApiKey(serverEnv: { OPENROUTER_API_KEY?: string }) {
  return Boolean(serverEnv.OPENROUTER_API_KEY?.trim());
}

let missingKeyWarned = false;

export function warnMissingOpenRouterApiKeyOnce() {
  if (missingKeyWarned) {
    return;
  }
  missingKeyWarned = true;
  console.warn("[llm-g2p] OPENROUTER_API_KEY is not set; automatic G2P correction is skipped");
}

export function resetMissingOpenRouterApiKeyWarningForTests() {
  missingKeyWarned = false;
}
