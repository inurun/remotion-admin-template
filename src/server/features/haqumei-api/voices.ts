import type { VoiceOption } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import type { components } from "@/server/generated/haqumei-api/schema";
import { getHaqumeiApiClient, unwrapHaqumeiData } from "./client";
import { HaqumeiApiError } from "./error";

type VoicevoxVoice = components["schemas"]["VoicevoxVoice"];
type VoisonaVoice = components["schemas"]["VoisonaVoice"];

function toVoicevoxVoiceOption(voice: VoicevoxVoice): VoiceOption {
  return {
    provider: "voicevox",
    voiceName: String(voice.speaker),
    voiceVersion: voice.version,
    displayName: `${voice.speaker_name} / ${voice.style_name}`,
  };
}

function getVoisonaDisplayName(voice: VoisonaVoice) {
  const names = voice.display_names ?? [];
  const preferred =
    names.find((item) => item.language === "ja_JP") ??
    names.find((item) => item.language === "ja") ??
    names[0];

  return preferred?.name || voice.voice_name;
}

function toVoisonaVoiceOption(voice: VoisonaVoice): VoiceOption {
  return {
    provider: "voisona",
    voiceName: voice.voice_name,
    voiceVersion: voice.voice_version,
    displayName: getVoisonaDisplayName(voice),
  };
}

export async function listVoicevoxVoices(serverEnv: ServerEnv): Promise<VoiceOption[]> {
  const response = await getHaqumeiApiClient(serverEnv).GET("/v1/voices/voicevox", {
    cache: "no-store",
  });
  return unwrapHaqumeiData(response).voices.map(toVoicevoxVoiceOption);
}

async function listVoisonaVoices(serverEnv: ServerEnv): Promise<VoiceOption[]> {
  const response = await getHaqumeiApiClient(serverEnv).GET("/v1/voices/voisona", {
    cache: "no-store",
  });
  return unwrapHaqumeiData(response).voices.map(toVoisonaVoiceOption);
}

export async function listOptionalVoisonaVoices(serverEnv: ServerEnv): Promise<VoiceOption[]> {
  try {
    return await listVoisonaVoices(serverEnv);
  } catch (error) {
    if (error instanceof HaqumeiApiError && error.code === "engine_not_configured") {
      console.warn("Skipping VoiSona voices: engine_not_configured");
      return [];
    }

    throw error;
  }
}
