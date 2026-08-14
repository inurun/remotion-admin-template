import { Hono } from "hono";
import { ogpRequestSchema, ogpResponseSchema } from "./contract";
import { assertHttpUrl, parseOgpFromHtml } from "./parse-ogp";
import { jsonError } from "@/server/_shared/http";

export const ogpApp = new Hono().post("/ogp", async (c) => {
  try {
    const { url: rawUrl } = ogpRequestSchema.parse(await c.req.json());
    const url = assertHttpUrl(rawUrl);

    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "remotion-admin-template-ogp/1.0",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return c.json({ error: `Failed to fetch URL (${response.status})` }, 400);
    }

    const html = await response.text();
    return c.json(ogpResponseSchema.parse(await parseOgpFromHtml(html, url)));
  } catch (error) {
    return jsonError(c, 500, error, "Failed to fetch OGP");
  }
});
