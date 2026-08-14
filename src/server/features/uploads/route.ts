import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import type { Context } from "hono";
import { imageUploadResponseSchema, videoUploadResponseSchema } from "./contract";
import {
  ensureProjectDirs,
  getProjectUploadsDir,
  toProjectUploadsSrc,
} from "@/server/_shared/storage";
import { jsonError } from "@/server/_shared/http";

const IMAGE_MIME_TO_EXTENSION = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const VIDEO_MIME_TO_EXTENSION = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
} as const;

function getUploadedFile(formData: FormData) {
  const file = formData.get("file");
  return file instanceof File ? file : null;
}

function getProjectPath(formData: FormData) {
  const projectPath = formData.get("projectPath");
  return typeof projectPath === "string" ? projectPath.trim() : "";
}

async function storeUpload(
  projectPath: string,
  file: File,
  mimeToExtension: Record<string, string>,
  unsupportedMessage: string,
) {
  const extension = mimeToExtension[file.type];
  if (!extension) {
    return { error: unsupportedMessage as string, src: null };
  }

  await ensureProjectDirs();

  const fileName = `${crypto.randomUUID()}.${extension}`;
  const outputDir = getProjectUploadsDir(projectPath);
  const outputPath = path.join(outputDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, buffer);

  return { error: null, src: toProjectUploadsSrc(projectPath, fileName) };
}

async function handleUpload(
  c: Context,
  mimeToExtension: Record<string, string>,
  unsupportedMessage: string,
  responseSchema: typeof imageUploadResponseSchema | typeof videoUploadResponseSchema,
  failureMessage: string,
) {
  try {
    const formData = await c.req.formData();
    const projectPath = getProjectPath(formData);
    if (!projectPath) {
      return c.json({ error: "projectPath is required" }, 400);
    }

    const file = getUploadedFile(formData);
    if (!file) {
      return c.json({ error: "file is required" }, 400);
    }

    const result = await storeUpload(projectPath, file, mimeToExtension, unsupportedMessage);
    if (result.error || !result.src) {
      return c.json({ error: result.error }, 400);
    }

    return c.json(responseSchema.parse({ src: result.src }));
  } catch (error) {
    return jsonError(c, 500, error, failureMessage);
  }
}

export const uploadsApp = new Hono()
  .post("/uploads/image", (c) =>
    handleUpload(
      c,
      IMAGE_MIME_TO_EXTENSION,
      "unsupported image type",
      imageUploadResponseSchema,
      "Failed to upload image",
    ),
  )
  .post("/uploads/video", (c) =>
    handleUpload(
      c,
      VIDEO_MIME_TO_EXTENSION,
      "unsupported video type",
      videoUploadResponseSchema,
      "Failed to upload video",
    ),
  );
