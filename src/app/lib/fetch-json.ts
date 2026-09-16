function getDefaultHttpError(status: number) {
  return `HTTP ${status}`;
}

function getJsonError(json: unknown) {
  if (typeof json !== "object" || !json || !("error" in json)) {
    return undefined;
  }

  return (json as { error?: string }).error;
}

function getResponseErrorMessage(json: unknown, status: number) {
  return getJsonError(json) ?? getDefaultHttpError(status);
}

export async function parseApiJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(getResponseErrorMessage(json, response.status));
  }

  return json;
}
