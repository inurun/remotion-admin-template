import type { EndcardAdvertiser } from "@/_schemas";
import { api } from "@/app/lib/api-client";
import { parseApiJson } from "@/app/lib/fetch-json";

export type NicoadResult = {
  videoId: string;
  advertisers: Array<
    Pick<EndcardAdvertiser, "userId" | "identityKey" | "introductionCount" | "name" | "message">
  >;
};

export async function fetchNicoad(source: string) {
  return parseApiJson<NicoadResult>(
    await api.nicoad.$post({
      json: { source },
    }),
  );
}
