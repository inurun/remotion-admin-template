import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import fresh from "fresh";
import rangeParser from "range-parser";

// Imported by scripts/vite as well, so no "@/" imports here.

function streamBody(method: string, filePath: string, range?: { start: number; end: number }) {
  if (method === "HEAD") {
    return null;
  }

  return Readable.toWeb(createReadStream(filePath, range)) as ReadableStream<Uint8Array>;
}

function isRangeFresh(ifRange: string | null, etag: string, lastModified: string) {
  if (!ifRange) {
    return true;
  }

  if (ifRange.includes('"')) {
    return ifRange === etag;
  }

  return Date.parse(lastModified) <= Date.parse(ifRange);
}

/**
 * Streams a file with HTTP Range and conditional GET support.
 * Throws when the path is not a readable file so callers can map it to 404.
 */
export async function serveFile(
  filePath: string,
  request: Pick<Request, "headers" | "method">,
  contentType: string,
) {
  const requestHeaders = request.headers;
  const stats = await fs.stat(filePath);
  if (!stats.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }

  const { size } = stats;
  const etag = `W/"${size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}"`;
  const lastModified = stats.mtime.toUTCString();
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    // Files are rewritten in place (TTS regeneration), so always revalidate,
    // but let the browser keep and reuse media bytes across seeks via 304.
    "Cache-Control": "no-cache",
    "Content-Type": contentType,
    ETag: etag,
    "Last-Modified": lastModified,
  });

  const isFresh = fresh(
    {
      "cache-control": requestHeaders.get("cache-control") ?? undefined,
      "if-modified-since": requestHeaders.get("if-modified-since") ?? undefined,
      "if-none-match": requestHeaders.get("if-none-match") ?? undefined,
    },
    { etag, "last-modified": lastModified },
  );
  if (isFresh) {
    return new Response(null, { status: 304, headers });
  }

  const rangeHeader = requestHeaders.get("range");
  if (rangeHeader && isRangeFresh(requestHeaders.get("if-range"), etag, lastModified)) {
    const ranges = rangeParser(size, rangeHeader, { combine: true });
    if (ranges === -1) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }

    // Malformed (-2) or multipart ranges fall back to the full body.
    if (ranges !== -2 && ranges.type === "bytes" && ranges.length === 1) {
      const [range] = ranges;
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
      headers.set("Content-Length", String(range.end - range.start + 1));
      return new Response(streamBody(request.method, filePath, range), { status: 206, headers });
    }
  }

  headers.set("Content-Length", String(size));
  return new Response(streamBody(request.method, filePath), { status: 200, headers });
}
