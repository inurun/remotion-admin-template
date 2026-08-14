import createClient, { type ClientOptions } from "openapi-fetch";

import type { paths } from "./schema";

export type VoicevoxPaths = paths;
export type VoicevoxClientOptions = ClientOptions & {
  baseUrl: string;
};
export type VoicevoxClient = ReturnType<typeof createVoicevoxClient>;

export function createVoicevoxClient(options: VoicevoxClientOptions) {
  return createClient<paths>(options);
}
