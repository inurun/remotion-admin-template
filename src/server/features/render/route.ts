import fs from "node:fs/promises";
import type { Context } from "hono";
import { Hono } from "hono";
import {
  InvalidProjectPathError,
  LATEST_VIDEO_PATH,
  ProjectNotFoundError,
} from "@/server/_shared/storage";
import { jsonError } from "@/server/_shared/http";
import { readRenderSnapshot, startRender } from "./render-state";
import {
  renderSnapshotSchema,
  renderStartRequestSchema,
  renderStartResponseSchema,
} from "./contract";
import { createRenderStream } from "./render-stream";

function getRenderStartErrorStatus(error: unknown) {
  if (error instanceof InvalidProjectPathError) {
    return 400;
  }

  if (error instanceof ProjectNotFoundError) {
    return 404;
  }

  return 500;
}

function createRenderStartErrorResponse(c: Context, error: unknown) {
  const status = getRenderStartErrorStatus(error);
  return jsonError(c, status, error, "Render start failed");
}

function isRenderConflict(result: { started: boolean }) {
  return !result.started;
}

export const renderApp = new Hono()
  .get("/render", async (c) => {
    try {
      return c.json(renderSnapshotSchema.parse(await readRenderSnapshot()));
    } catch (error) {
      return jsonError(c, 500, error, "Failed to load render state");
    }
  })
  .post("/render", async (c) => {
    try {
      const payload = renderStartRequestSchema.parse(await c.req.json());
      const result = renderStartResponseSchema.parse(await startRender(payload.projectPath));
      if (isRenderConflict(result)) {
        return c.json({ error: "Render is already running.", ...result }, 409);
      }
      return c.json(result);
    } catch (error) {
      return createRenderStartErrorResponse(c, error);
    }
  })
  .get("/render/stream", async (c) => {
    return new Response(createRenderStream(c.req.raw.signal), {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
      },
    });
  })
  .get("/render/video", async () => {
    try {
      const file = await fs.readFile(LATEST_VIDEO_PATH);
      return new Response(file, {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "video/mp4",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
