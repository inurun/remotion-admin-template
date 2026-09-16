import { api } from "@/app/lib/api-client";
import { parseApiJson } from "@/app/lib/fetch-json";

export async function fetchBgmFiles(): Promise<string[]> {
  const result = await parseApiJson<{ files: string[] }>(await api.bgm.$get());
  return result.files;
}
