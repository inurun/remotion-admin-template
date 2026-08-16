import createClient, { type ClientOptions } from "openapi-fetch";

import type { paths } from "./schema";

export type HaqumeiApiPaths = paths;
export type HaqumeiApiClientOptions = ClientOptions & {
  baseUrl: string;
};
export type HaqumeiApiClient = ReturnType<typeof createHaqumeiApiClient>;

export function createHaqumeiApiClient(options: HaqumeiApiClientOptions) {
  return createClient<paths>(options);
}
