import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { pipeline, Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import type { Connect, Plugin } from "vite";
import { serveFile } from "../../src/server/_shared/serve-file";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const RUNTIME_PREFIXES = ["/uploads/", "/tts/"];

const CONTENT_TYPES = new Map([
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".mov", "video/quicktime"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
  [".wav", "audio/wav"],
]);

function getRequestPathname(url: string | undefined) {
  if (!url) {
    return null;
  }

  try {
    return decodeURIComponent(new URL(url, "http://localhost").pathname);
  } catch {
    return null;
  }
}

export function resolveRuntimePublicFile(pathname: string) {
  if (!RUNTIME_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const relativePath = path.normalize(pathname.replace(/^\/+/u, ""));
  if (relativePath.startsWith("..")) {
    return null;
  }

  return path.join(PUBLIC_DIR, relativePath);
}

function toRequestHeaders(req: IncomingMessage) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    }
  }
  return headers;
}

async function sendRuntimePublicFile(
  filePath: string,
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
  next: Connect.NextFunction,
) {
  let response: Response;
  try {
    const contentType = CONTENT_TYPES.get(path.extname(filePath).toLowerCase());
    response = await serveFile(
      filePath,
      { headers: toRequestHeaders(req), method: req.method ?? "GET" },
      contentType ?? "application/octet-stream",
    );
  } catch {
    next();
    return;
  }

  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (!response.body) {
    res.end();
    return;
  }

  // Client aborts during seeks are expected; ignore stream errors.
  pipeline(Readable.fromWeb(response.body as NodeReadableStream), res, () => {});
}

export const serveRuntimePublicAssetsPlugin = (): Plugin => ({
  name: "serve-runtime-public-assets",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const pathname = getRequestPathname(req.url);
      if (!pathname) {
        next();
        return;
      }

      const filePath = resolveRuntimePublicFile(pathname);
      if (!filePath) {
        next();
        return;
      }

      void sendRuntimePublicFile(filePath, req, res, next);
    });
  },
});
