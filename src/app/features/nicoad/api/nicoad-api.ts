import type { EndcardAdvertiser } from "@/_schemas";
import { api } from "@/_shared/lib/api-client";
import { parseApiJson } from "@/_shared/lib/fetch-json";

export type NicoadResult = {
  videoId: string;
  advertisers: Array<Pick<EndcardAdvertiser, "name" | "message">>;
};

export async function fetchNicoad(source: string) {
  return parseApiJson<NicoadResult>(
    await api.nicoad.$post({
      json: { source },
    }),
  );
}
