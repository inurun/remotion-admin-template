import { api } from "@/_shared/lib/api-client";
import { parseApiJson } from "@/_shared/lib/fetch-json";

export async function fetchBgmFiles(): Promise<string[]> {
  const result = await parseApiJson<{ files: string[] }>(await api.bgm.$get());
  return result.files;
}
