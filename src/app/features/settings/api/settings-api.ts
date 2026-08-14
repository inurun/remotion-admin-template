import type { VoiceOption } from "@/_schemas";
import { api } from "@/_shared/lib/api-client";
import { parseApiJson } from "@/_shared/lib/fetch-json";

export async function fetchVoices() {
  return parseApiJson<{ options: VoiceOption[] }>(await api.voices.$get());
}
