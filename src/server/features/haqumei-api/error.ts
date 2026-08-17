import type { components } from "@/server/generated/haqumei-api/schema";

type HaqumeiProblemDetails = components["schemas"]["ProblemDetails"];
type HaqumeiFieldError = components["schemas"]["FieldError"];

const TEXTS_PATH = /^texts\[(\d+)\]$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseFieldErrors(value: unknown): HaqumeiFieldError[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.path !== "string" || typeof item.reason !== "string") {
      return [];
    }

    return [{ path: item.path, reason: item.reason }];
  });
}

export function parseHaqumeiProblemDetails(error: unknown, status: number): HaqumeiProblemDetails {
  if (!isRecord(error) || typeof error.code !== "string") {
    return {
      type: "about:blank",
      title: "haqumei-api error",
      status,
      code: "engine_failed",
      detail: `haqumei-api request failed (${status})`,
      errors: [],
    };
  }

  return {
    type: typeof error.type === "string" ? error.type : "about:blank",
    title: typeof error.title === "string" ? error.title : "haqumei-api error",
    status: typeof error.status === "number" ? error.status : status,
    code: error.code,
    detail: typeof error.detail === "string" ? error.detail : "",
    errors: parseFieldErrors(error.errors),
  };
}

function formatFieldErrors(errors: HaqumeiFieldError[]) {
  return errors.map((item) => `${item.path}: ${item.reason}`).join(", ");
}

function formatHaqumeiApiError(problem: HaqumeiProblemDetails) {
  if (problem.detail) {
    return problem.detail;
  }

  const fields = formatFieldErrors(problem.errors ?? []);
  if (fields) {
    return `${problem.code}: ${fields}`;
  }

  return problem.title || problem.code;
}

function formatChunkLog(error: HaqumeiApiError) {
  if (error.chunkOffset === undefined) {
    return "";
  }

  const chunkOffset = error.chunkOffset;
  const globalPaths = error.errors.flatMap((item) => {
    const match = TEXTS_PATH.exec(item.path);
    if (!match) {
      return [];
    }

    return [`texts[${chunkOffset + Number(match[1])}]`];
  });

  const parts = [`chunkOffset=${chunkOffset}`];
  if (globalPaths.length > 0) {
    parts.push(`global=${globalPaths.join(",")}`);
  }

  return ` ${parts.join(" ")}`;
}

export function formatHaqumeiApiLog(error: HaqumeiApiError) {
  const fields = formatFieldErrors(error.errors);
  const fieldSuffix = fields ? ` [${fields}]` : "";
  return `${error.status} ${error.code}: ${error.message}${fieldSuffix}${formatChunkLog(error)}`;
}

export class HaqumeiApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly errors: HaqumeiFieldError[];
  chunkOffset?: number;

  constructor(problem: HaqumeiProblemDetails) {
    super(formatHaqumeiApiError(problem));
    this.name = "HaqumeiApiError";
    this.status = problem.status;
    this.code = problem.code;
    this.title = problem.title;
    this.detail = problem.detail;
    this.errors = problem.errors ?? [];
  }

  withChunkOffset(chunkOffset: number) {
    this.chunkOffset = chunkOffset;
    return this;
  }

  static fromUnknown(error: unknown, status: number) {
    return new HaqumeiApiError(parseHaqumeiProblemDetails(error, status));
  }
}
