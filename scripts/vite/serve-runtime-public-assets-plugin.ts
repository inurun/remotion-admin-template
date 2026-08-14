import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Connect, Plugin } from "vite";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const UPLOADS_PREFIX = "/uploads/";

const CONTENT_TYPES = new Map([
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".mov", "video/quicktime"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
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

function resolveUploadsFile(pathname: string) {
  if (!pathname.startsWith(UPLOADS_PREFIX)) {
    return null;
  }

  const relativePath = path.normalize(pathname.replace(/^\/+/u, ""));
  if (relativePath.startsWith("..")) {
    return null;
  }

  return path.join(PUBLIC_DIR, relativePath);
}

async function sendUploadsFile(
  filePath: string,
  res: ServerResponse<IncomingMessage>,
  next: Connect.NextFunction,
) {
  try {
    const file = await fs.readFile(filePath);
    const contentType = CONTENT_TYPES.get(path.extname(filePath).toLowerCase());

    res.statusCode = 200;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", contentType ?? "application/octet-stream");
    res.setHeader("Content-Length", file.byteLength);
    res.end(file);
  } catch {
    next();
  }
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

      const filePath = resolveUploadsFile(pathname);
      if (!filePath) {
        next();
        return;
      }

      void sendUploadsFile(filePath, res, next);
    });
  },
});
