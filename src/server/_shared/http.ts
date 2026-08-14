import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }

  return typeof error.code === "string" ? error.code : undefined;
}

function formatErrorReason(error: unknown, seen = new Set<unknown>()): string {
  if (error == null) {
    return "unknown";
  }

  if (typeof error !== "object") {
    return String(error);
  }

  if (seen.has(error)) {
    return "[Circular]";
  }
  seen.add(error);

  if (error instanceof AggregateError) {
    const nested = error.errors.map((item) => formatErrorReason(item, seen)).join("; ");
    const code = getErrorCode(error);
    const message = error.message || "AggregateError";
    return code ? `${message} (${code}: ${nested})` : `${message}: ${nested}`;
  }

  if (error instanceof Error) {
    const code = getErrorCode(error);
    const base = code
      ? `${error.name}: ${error.message} [${code}]`
      : `${error.name}: ${error.message}`;
    if (!error.cause) {
      return base;
    }

    return `${base} <- ${formatErrorReason(error.cause, seen)}`;
  }

  const code = getErrorCode(error);
  if (code) {
    return code;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function jsonError(
  c: Context,
  status: ContentfulStatusCode,
  error: unknown,
  fallback: string,
) {
  const reason = formatErrorReason(error);
  console.error(`[api] ${c.req.method} ${c.req.path} -> ${status}: ${reason}`);

  return c.json(
    {
      error: error instanceof Error ? error.message : fallback,
    },
    { status },
  );
}

export function sseMessage(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}
