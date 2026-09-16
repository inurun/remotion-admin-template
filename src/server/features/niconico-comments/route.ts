import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { jsonError } from "@/server/_shared/http";
import { niconicoCommentsRequestSchema, niconicoCommentsResponseSchema } from "./contract";
import { NiconicoCommentsError } from "./parse-watch-data";
import { fetchNiconicoComments } from "./use-case";

export const niconicoCommentsApp = new Hono().post("/niconico-comments", async (c) => {
  try {
    const { source } = niconicoCommentsRequestSchema.parse(await c.req.json());
    return c.json(niconicoCommentsResponseSchema.parse(await fetchNiconicoComments(source)));
  } catch (error) {
    if (error instanceof NiconicoCommentsError) {
      return c.json({ error: error.message }, error.status as ContentfulStatusCode);
    }

    return jsonError(c, 500, error, "Failed to fetch niconico comments");
  }
});
