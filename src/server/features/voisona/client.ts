import type { ServerEnv } from "@/server/core/env";
import { createVoiSonaClient } from "@/server/generated/voisona/client";
import type { operations } from "@/server/generated/voisona/schema";

type SpeechSynthesisRequestState =
  operations["getSpeechSynthesisRequest"]["responses"][200]["content"]["application/json"];
type TextAnalysisRequestState =
  operations["getTextAnalysisRequest"]["responses"][200]["content"]["application/json"];
type VoiSonaRequestState = SpeechSynthesisRequestState | TextAnalysisRequestState;

function getCredentials(serverEnv: ServerEnv) {
  const username = serverEnv.VOISONA_USERNAME;
  const password = serverEnv.VOISONA_PASSWORD;

  if (!username || !password) {
    throw new Error("VOISONA_USERNAME and VOISONA_PASSWORD must be set in .env.local.");
  }

  return { username, password };
}

function getVoisonaBase(serverEnv: ServerEnv) {
  return serverEnv.VOISONA_BASE ?? "http://localhost:32766/api/talk/v1";
}

export { getVoisonaBase };

export function getVoisonaClient(serverEnv: ServerEnv) {
  const { username, password } = getCredentials(serverEnv);

  return createVoiSonaClient({
    baseUrl: getVoisonaBase(serverEnv),
    username,
    password,
  });
}

function getVoisonaRequestOutcome(result: VoiSonaRequestState | null) {
  if (!result) {
    return "retry";
  }

  if (result.state === "succeeded") {
    return "success";
  }

  if (result.state === "failed") {
    return "failed";
  }

  return "retry";
}

async function fetchVoisonaRequestState(
  serverEnv: ServerEnv,
  endpoint: "speech-syntheses" | "text-analyses",
  uuid: string,
) {
  const client = getVoisonaClient(serverEnv);
  const result =
    endpoint === "speech-syntheses"
      ? await client.GET("/speech-syntheses/{uuid}", {
          params: { path: { uuid } },
          cache: "no-store",
        })
      : await client.GET("/text-analyses/{uuid}", {
          params: { path: { uuid } },
          cache: "no-store",
        });

  return result.response.ok && result.data ? result.data : null;
}

async function waitForNextPoll() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

function requireSuccessfulVoisonaResult(
  endpoint: "speech-syntheses" | "text-analyses",
  result: VoiSonaRequestState | null,
) {
  if (!result) {
    throw new Error(`VoiSona ${endpoint} succeeded without a response body`);
  }

  return result;
}

function resolveVoisonaRequestPoll(
  endpoint: "speech-syntheses" | "text-analyses",
  result: VoiSonaRequestState | null,
) {
  const outcome = getVoisonaRequestOutcome(result);

  if (outcome === "success") {
    return requireSuccessfulVoisonaResult(endpoint, result);
  }

  if (outcome === "failed") {
    throw new Error(`VoiSona ${endpoint} failed: ${JSON.stringify(result)}`);
  }

  return null;
}

async function pollVoisonaRequest(
  serverEnv: ServerEnv,
  endpoint: "speech-syntheses" | "text-analyses",
  uuid: string,
) {
  await waitForNextPoll();
  const result = await fetchVoisonaRequestState(serverEnv, endpoint, uuid);
  return resolveVoisonaRequestPoll(endpoint, result);
}

export async function waitForVoisonaRequest(
  serverEnv: ServerEnv,
  endpoint: "speech-syntheses" | "text-analyses",
  uuid: string,
) {
  let attempts = 120;

  while (attempts > 0) {
    attempts -= 1;

    const result = await pollVoisonaRequest(serverEnv, endpoint, uuid);
    if (result) {
      return result;
    }
  }

  throw new Error(`VoiSona ${endpoint} timed out`);
}
