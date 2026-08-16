import type { ServerEnv } from "@/server/core/env";
import { createHaqumeiApiClient } from "@/server/generated/haqumei-api/client";
import { HaqumeiApiError } from "./error";

const DEFAULT_HAQUMEI_API_URL = "http://127.0.0.1:8080";

export function getHaqumeiApiUrl(serverEnv: ServerEnv) {
  return serverEnv.HAQUMEI_API_URL ?? DEFAULT_HAQUMEI_API_URL;
}

export function getHaqumeiApiClient(serverEnv: ServerEnv) {
  return createHaqumeiApiClient({
    baseUrl: getHaqumeiApiUrl(serverEnv),
  });
}

export function unwrapHaqumeiData<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.response.ok && result.data !== undefined) {
    return result.data;
  }

  throw HaqumeiApiError.fromUnknown(result.error, result.response.status);
}
