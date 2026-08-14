import type { OgpMetadata } from "@/_schemas";
import { api } from "@/_shared/lib/api-client";
import { parseApiJson } from "@/_shared/lib/fetch-json";

export type OgpResult = OgpMetadata;

export async function fetchOgp(url: string) {
  return parseApiJson<OgpResult>(
    await api.ogp.$post({
      json: { url },
    }),
  );
}
