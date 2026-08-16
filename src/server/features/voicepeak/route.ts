import { Hono } from "hono";
import { z } from "zod";
import { jsonError } from "@/server/_shared/http";
import { getServerEnv } from "@/server/core/env";
import { listVoicepeakVoices, synthesizeVoicepeak } from "@/server/features/voicepeak/use-case";
import {
  synthesizeResponseSchema,
  voicepeakSynthesizeRequestSchema,
  voicesResponseSchema,
} from "./contract";

export const voicepeakApp = new Hono()
  .get("/voicepeak/voices", async (c) => {
    try {
      return c.json(
        voicesResponseSchema.parse({ options: await listVoicepeakVoices(getServerEnv(c)) }),
      );
    } catch (error) {
      return jsonError(c, 500, error, "Failed to load VoicePeak voices");
    }
  })
  .post("/voicepeak/synthesize", async (c) => {
    try {
      const json = voicepeakSynthesizeRequestSchema
        .extend({ projectPath: z.string().min(1) })
        .parse(await c.req.json());
      return c.json(
        synthesizeResponseSchema.parse(
          await synthesizeVoicepeak({
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
