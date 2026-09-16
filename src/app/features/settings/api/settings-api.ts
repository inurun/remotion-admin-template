import type { VoiceOption } from "@/_schemas";
import { api } from "@/app/lib/api-client";
import { parseApiJson } from "@/app/lib/fetch-json";

export async function fetchVoices() {
  return parseApiJson<{ options: VoiceOption[] }>(await api.voices.$get());
}
