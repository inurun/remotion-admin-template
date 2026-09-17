import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const openapi = JSON.parse(
  readFileSync(path.join(process.cwd(), "openapi/haqumei-api/openapi.json"), "utf8"),
) as {
  paths: Record<
    string,
    { post?: { responses?: Record<string, { content?: Record<string, unknown> }> } }
  >;
};

function isBinaryWav(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") {
    return false;
  }
  const record = schema as { type?: string; format?: string; $ref?: string };
  if (record.$ref) {
    const name = record.$ref.split("/").at(-1);
    const components = (
      JSON.parse(
        readFileSync(path.join(process.cwd(), "openapi/haqumei-api/openapi.json"), "utf8"),
      ) as { components?: { schemas?: Record<string, { type?: string; format?: string }> } }
    ).components?.schemas;
    const resolved = name ? components?.[name] : undefined;
    return resolved?.type === "string" && resolved.format === "binary";
  }
  return record.type === "string" && record.format === "binary";
}

describe("haqumei-api coeiroink contract snapshot", () => {
  it("includes coeiroink voice and binary wav synthesis paths", () => {
    expect(openapi.paths["/v1/voices/coeiroink"]).toBeDefined();
    const post = openapi.paths["/v1/synthesis/coeiroink"]?.post;
    expect(post).toBeDefined();
    const wav = post?.responses?.["200"]?.content?.["audio/wav"] as
      | { schema?: unknown }
      | undefined;
    expect(isBinaryWav(wav?.schema)).toBe(true);
  });
});
