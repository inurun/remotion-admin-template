import type { ServerEnv } from "@/server/core/env";
import { createVoicevoxClient } from "@/server/generated/voicevox/client";

export function getVoicevoxBase(serverEnv: ServerEnv) {
  return serverEnv.VOICEVOX_URL ?? "http://localhost:50021";
}

export function getVoicevoxClient(serverEnv: ServerEnv) {
  return createVoicevoxClient({
    baseUrl: getVoicevoxBase(serverEnv),
  });
}
