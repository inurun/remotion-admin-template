import { Hono } from "hono";
import { jsonError } from "@/server/_shared/http";
import { nicoadRequestSchema, nicoadResponseSchema, nicoadThanksResponseSchema } from "./contract";
import {
  NicoadSourceError,
  parseNicoadVideoId,
  uniqueNicoadAdvertisers,
} from "./parse-nicoad-source";

const NICOAD_CONTENTS_URL = "https://api.nicoad.nicovideo.jp/v1/contents/video";
const NICOAD_ADVERTISER_LIMIT = 1000;

export const nicoadApp = new Hono().post("/nicoad", async (c) => {
  try {
    const { source } = nicoadRequestSchema.parse(await c.req.json());
    const videoId = parseNicoadVideoId(source);
    const url = `${NICOAD_CONTENTS_URL}/${videoId}/thanks?limit=${NICOAD_ADVERTISER_LIMIT}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return c.json({ error: `Failed to fetch nicoad (${response.status})` }, 400);
    }

    const parsed = nicoadThanksResponseSchema.parse(await response.json());
    if (parsed.meta.status !== 200) {
      return c.json({ error: `Failed to fetch nicoad (${parsed.meta.status})` }, 400);
    }

    return c.json(
      nicoadResponseSchema.parse({
        videoId,
        advertisers: uniqueNicoadAdvertisers(parsed.data.sponsors),
      }),
    );
  } catch (error) {
    if (error instanceof NicoadSourceError) {
      return c.json({ error: error.message }, 400);
    }

    return jsonError(c, 500, error, "Failed to fetch nicoad");
  }
});
