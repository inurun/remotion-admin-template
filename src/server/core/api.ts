import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { renderToString } from "react-dom/server";
import { layoutHtml } from "@/app/core/layout";
import { getProjectRootHref, parseProjectRoute } from "@/app/features/project/lib/project-route";
import {
  ensureProjectDirs,
  getPublicFilePath,
  InvalidProjectPathError,
  listSavedProjects,
  ProjectNotFoundError,
  readSavedProject,
} from "@/server/_shared/storage";
import { bgmApp } from "@/server/features/bgm";
import { nicoadApp } from "@/server/features/nicoad";
import { ogpApp } from "@/server/features/ogp";
import { projectApp } from "@/server/features/project";
import { publishApp } from "@/server/features/publish";
import { renderApp } from "@/server/features/render";
import { ttsApp } from "@/server/features/tts";
import { uploadsApp } from "@/server/features/uploads";
import { voicepeakApp } from "@/server/features/voicepeak";
import { scheduleApp } from "@/server/features/schedule";
import { weatherApp } from "@/server/features/weather";

const CONTENT_TYPES = new Map([
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".wav", "audio/wav"],
  [".webp", "image/webp"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"],
  [".aac", "audio/aac"],
  [".flac", "audio/flac"],
  [".mp4", "video/mp4"],
  [".mov", "video/quicktime"],
  [".webm", "video/webm"],
]);

async function servePublicAsset(publicPath: string) {
  const filePath = getPublicFilePath(publicPath);
  const file = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  return new Response(file, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": CONTENT_TYPES.get(ext) ?? "application/octet-stream",
    },
  });
}

async function resolveRootProjectPath() {
  const projects = await listSavedProjects();
  const project = projects[0];
  if (!project) {
    throw new ProjectNotFoundError("Project not found");
  }

  return getProjectRootHref(project.path);
}

async function assertProjectRouteExists(requestPath: string) {
  const route = parseProjectRoute(requestPath);
  if (route.type === "schedules") {
    return;
  }

  if (route.type === "unknown") {
    throw new InvalidProjectPathError("Invalid project path");
  }

  await readSavedProject(route.projectPath);
}

function createApi() {
  return new Hono()
    .route("/", projectApp)
    .route("/", ttsApp)
    .route("/", voicepeakApp)
    .route("/", renderApp)
    .route("/", publishApp)
    .route("/", uploadsApp)
    .route("/", bgmApp)
    .route("/", weatherApp)
    .route("/", ogpApp)
    .route("/", nicoadApp)
    .route("/", scheduleApp);
}

export type ApiApp = ReturnType<typeof createApi>;

export const createApp = () => {
  const app = new Hono()
    .route("/api", createApi())
    .get("/uploads/*", async (c) => {
      try {
        await ensureProjectDirs();
        return await servePublicAsset(c.req.path.replace(/^\/+/u, ""));
      } catch {
        return new Response("Not found", { status: 404 });
      }
    })
    .get("/tts/*", async (c) => {
      try {
        await ensureProjectDirs();
        return await servePublicAsset(c.req.path.replace(/^\/+/u, ""));
      } catch {
        return new Response("Not found", { status: 404 });
      }
    })
    .get("/bgm/*", async (c) => {
      try {
        await ensureProjectDirs();
        return await servePublicAsset(c.req.path.replace(/^\/+/u, ""));
      } catch {
        return new Response("Not found", { status: 404 });
      }
    })
    .get("/", async (c) => {
      try {
        return c.redirect(await resolveRootProjectPath());
      } catch {
        return c.html(renderToString(layoutHtml), 404);
      }
    })
    .get("*", async (c) => {
      try {
        await assertProjectRouteExists(c.req.path);
        return c.html(renderToString(layoutHtml));
      } catch (error) {
        if (error instanceof InvalidProjectPathError || error instanceof ProjectNotFoundError) {
          return c.html(renderToString(layoutHtml), 404);
        }

        return c.html(renderToString(layoutHtml), 500);
      }
    });

  return app;
};
