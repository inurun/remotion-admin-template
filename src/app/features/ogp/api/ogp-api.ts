import type { OgpMetadata } from "@/_schemas";
import { api } from "@/app/lib/api-client";
import { parseApiJson } from "@/app/lib/fetch-json";

export type OgpResult = OgpMetadata;

export async function fetchOgp(url: string) {
  return parseApiJson<OgpResult>(
    await api.ogp.$post({
      json: { url },
    }),
  );
}
