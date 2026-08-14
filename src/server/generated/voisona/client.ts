import createClient, { type ClientOptions } from "openapi-fetch";

import type { components, paths } from "./schema";

export type VoiSonaPaths = paths;
export type VoiSonaComponents = components;
export type VoiSonaClient = ReturnType<typeof createVoiSonaClient>;
export type VoiSonaClientOptions = Omit<ClientOptions, "headers"> & {
  baseUrl: string;
  headers?: ClientOptions["headers"];
  password: string;
  username: string;
};

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function mergeHeaders(headers?: ClientOptions["headers"]): Headers {
  const mergedHeaders = new Headers();

  if (!headers) {
    return mergedHeaders;
  }

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      mergedHeaders.append(key, value);
    });
    return mergedHeaders;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      mergedHeaders.append(key, value);
    }
    return mergedHeaders;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        mergedHeaders.append(key, String(item));
      }
      continue;
    }

    mergedHeaders.set(key, String(value));
  }

  return mergedHeaders;
}

export function createVoiSonaClient(options: VoiSonaClientOptions) {
  const { headers, password, username, ...rest } = options;
  const mergedHeaders = mergeHeaders(headers);
  mergedHeaders.set("authorization", basicAuthHeader(username, password));

  return createClient<paths>({
    ...rest,
    headers: mergedHeaders,
  });
}
