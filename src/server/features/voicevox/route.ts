import { Hono } from "hono";
import { z } from "zod";
import { jsonError } from "@/server/_shared/http";
import { getServerEnv } from "@/server/core/env";
import {
  listVoicevoxVoices,
  analyzeVoicevoxText,
  synthesizeVoicevox,
} from "@/server/features/voicevox/use-case";
import {
  synthesizeResponseSchema,
  voicevoxAnalyzeRequestSchema,
  voicevoxAnalyzeResponseSchema,
  voicevoxSynthesizeRequestSchema,
  voicesResponseSchema,
} from "./contract";

export const voicevoxApp = new Hono()
  .get("/voicevox/voices", async (c) => {
    try {
      return c.json(
        voicesResponseSchema.parse({ options: await listVoicevoxVoices(getServerEnv(c)) }),
      );
    } catch (error) {
      return jsonError(c, 500, error, "Failed to load VOICEVOX voices");
    }
  })
  .post("/voicevox/analyze", async (c) => {
    try {
      const json = voicevoxAnalyzeRequestSchema.parse(await c.req.json());
      return c.json(
        voicevoxAnalyzeResponseSchema.parse(await analyzeVoicevoxText(getServerEnv(c), json)),
      );
    } catch (error) {
      return jsonError(c, 500, error, "Analyze failed");
    }
  })
  .post("/voicevox/synthesize", async (c) => {
    try {
      const json = voicevoxSynthesizeRequestSchema
        .extend({ projectPath: z.string().min(1) })
        .parse(await c.req.json());
      return c.json(
        synthesizeResponseSchema.parse(
          await synthesizeVoicevox({
            serverEnv: getServerEnv(c),
            ...json,
            synthesisSettings: json.synthesisSettings ?? undefined,
          }),
        ),
      );
    } catch (error) {
      return jsonError(c, 500, error, "Synthesize failed");
    }
  });
