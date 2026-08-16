import type { Context } from "hono";
import { env } from "hono/adapter";

export type ServerEnv = {
  NEXT_PUBLIC_VIDEO_FPS?: string;
  VITE_VIDEO_FPS?: string;
  HAQUMEI_API_URL?: string;
  VOICEPEAK_PATH?: string;
};

const serverEnvKeys = [
  "NEXT_PUBLIC_VIDEO_FPS",
  "VITE_VIDEO_FPS",
  "HAQUMEI_API_URL",
  "VOICEPEAK_PATH",
] as const satisfies readonly (keyof ServerEnv)[];

function trimEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function isQuotedEnvValue(value: string) {
  const quote = value[0];
  return (quote === '"' || quote === "'") && value.endsWith(quote);
}

function unwrapEnvValue(value: string) {
  return isQuotedEnvValue(value) ? value.slice(1, -1).trim() : value;
}

function normalizeEnvValue(value: string | undefined) {
  const trimmed = trimEnvValue(value);
  if (!trimmed) {
    return undefined;
  }

  return unwrapEnvValue(trimmed) || undefined;
}

export function getServerEnv(c: Context): ServerEnv {
  const raw = env<ServerEnv>(c);
  return Object.fromEntries(
    serverEnvKeys.map((key) => [key, normalizeEnvValue(raw[key])]),
  ) as ServerEnv;
}
