import type { components } from "@/server/generated/haqumei-api/schema";

type HaqumeiProblemDetails = components["schemas"]["ProblemDetails"];
type HaqumeiFieldError = components["schemas"]["FieldError"];

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

function formatHaqumeiApiError(problem: HaqumeiProblemDetails) {
  const paths = problem.errors?.map((item) => item.path).filter(Boolean) ?? [];
  if (paths.length > 0) {
    return `${problem.code}: ${paths.join(", ")}`;
  }

  return problem.detail || problem.title || problem.code;
}

export class HaqumeiApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly errors: HaqumeiFieldError[];

  constructor(problem: HaqumeiProblemDetails) {
    super(formatHaqumeiApiError(problem));
    this.name = "HaqumeiApiError";
    this.status = problem.status;
    this.code = problem.code;
    this.title = problem.title;
    this.detail = problem.detail;
    this.errors = problem.errors ?? [];
  }

  static fromUnknown(error: unknown, status: number) {
    return new HaqumeiApiError(parseHaqumeiProblemDetails(error, status));
  }
}
