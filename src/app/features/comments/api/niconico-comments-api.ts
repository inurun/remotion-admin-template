import { api } from "@/app/lib/api-client";
import { parseApiJson } from "@/app/lib/fetch-json";
import type { NiconicoCommentsResponse } from "@/server/features/niconico-comments/contract";

export async function fetchNiconicoComments(source: string) {
  return parseApiJson<NiconicoCommentsResponse>(
    await api["niconico-comments"].$post({
      json: { source },
    }),
  );
}
