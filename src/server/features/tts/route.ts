import { Hono } from "hono";
import { jsonError } from "@/server/_shared/http";
import { getServerEnv } from "@/server/core/env";
import { analyzeTts, clearTtsCache, listTtsVoices, synthesizeTts } from "./use-case";
import {
  synthesizeResponseSchema,
  ttsAnalyzeRequestSchema,
  ttsAnalyzeResponseSchema,
  ttsClearCacheRequestSchema,
  ttsClearCacheResponseSchema,
  ttsSynthesizeRequestSchema,
  voicesResponseSchema,
} from "./contract";

export const ttsApp = new Hono()
  .get("/voices", async (c) => {
    try {
      return c.json(voicesResponseSchema.parse({ options: await listTtsVoices(getServerEnv(c)) }));
    } catch (error) {
      return jsonError(c, 500, error, "Failed to load voices");
    }
  })
  .post("/tts/analyze", async (c) => {
    try {
      const json = ttsAnalyzeRequestSchema.parse(await c.req.json());
      return c.json(ttsAnalyzeResponseSchema.parse(await analyzeTts(getServerEnv(c), json)));
    } catch (error) {
      return jsonError(c, 500, error, "Analyze failed");
    }
  })
  .post("/tts/synthesize", async (c) => {
    try {
      const json = ttsSynthesizeRequestSchema.parse(await c.req.json());
      return c.json(synthesizeResponseSchema.parse(await synthesizeTts(getServerEnv(c), json)));
    } catch (error) {
      return jsonError(c, 500, error, "Synthesize failed");
    }
  })
  .delete("/tts/cache", async (c) => {
    try {
      const json = ttsClearCacheRequestSchema.parse(await c.req.json());
      return c.json(ttsClearCacheResponseSchema.parse(await clearTtsCache(json)));
    } catch (error) {
      return jsonError(c, 500, error, "Failed to clear TTS cache");
    }
  });
