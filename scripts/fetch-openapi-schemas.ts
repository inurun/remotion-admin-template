import path from "node:path";
import { promises as fs } from "node:fs";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const projectRoot = process.cwd();
const openapiRoot = path.join(projectRoot, "openapi");
const defaultVoicevoxUrl = "http://localhost:50021";
const defaultVoisonaBase = "http://localhost:32766/api/talk/v1";

function trimEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function unwrapQuotedValue(value: string) {
  const quote = value[0];
  return (quote === '"' || quote === "'") && value.endsWith(quote)
    ? value.slice(1, -1).trim()
    : value;
}

function normalizeEnvValue(value: string | undefined) {
  const trimmed = trimEnvValue(value);
  if (!trimmed) {
    return undefined;
  }

  const normalized = unwrapQuotedValue(trimmed);
  return normalized || undefined;
}

function requireEnv(name: string): string {
  const value = normalizeEnvValue(process.env[name]);
  if (!value) {
    throw new Error(`${name} must be set`);
  }

  return value;
}

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fetchText(url: string, headers?: Record<string, string>): Promise<string> {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}\n${text}`);
  }

  return text;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function getVoiSonaDocsBaseUrl(apiBaseUrl: string): string {
  const normalized = normalizeBaseUrl(apiBaseUrl);
  const docsBaseUrl = normalized.replace(/\/api\/talk\/v1$/u, "");

  if (docsBaseUrl === normalized) {
    throw new Error(`VOISONA_BASE must end with /api/talk/v1, got: ${apiBaseUrl}`);
  }

  return docsBaseUrl;
}

function assertVoicevoxSchema(value: unknown): asserts value is {
  openapi: string;
  paths: Record<string, unknown>;
} {
  if (typeof value !== "object" || value === null) {
    throw new Error("VOICEVOX schema is not an object");
  }

  const schema = value as { openapi?: unknown; paths?: unknown };
  if (typeof schema.openapi !== "string") {
    throw new Error("VOICEVOX schema missing openapi");
  }
  if (typeof schema.paths !== "object" || schema.paths === null) {
    throw new Error("VOICEVOX schema missing paths");
  }
  if (!("/speakers" in schema.paths)) {
    throw new Error("VOICEVOX schema missing /speakers");
  }
}

function assertVoiSonaSchema(text: string): void {
  const checks = [
    { pattern: /^openapi:/mu, label: "openapi" },
    { pattern: /^servers:/mu, label: "servers" },
    { pattern: /^  \/voices:/mu, label: "/voices" },
  ];

  for (const check of checks) {
    if (!check.pattern.test(text)) {
      throw new Error(`VoiSona schema missing ${check.label}`);
    }
  }
}

async function main(): Promise<void> {
  const voicevoxUrl = normalizeBaseUrl(
    normalizeEnvValue(process.env.VOICEVOX_URL) ?? defaultVoicevoxUrl,
  );
  const voisonaBase = normalizeBaseUrl(
    normalizeEnvValue(process.env.VOISONA_BASE) ?? defaultVoisonaBase,
  );
  const voisonaUsername = requireEnv("VOISONA_USERNAME");
  const voisonaPassword = requireEnv("VOISONA_PASSWORD");

  const voicevoxSchemaUrl = new URL("/openapi.json", `${voicevoxUrl}/`).toString();
  const voisonaDocsBaseUrl = getVoiSonaDocsBaseUrl(voisonaBase);
  const voisonaSchemaUrl = new URL("/docs/talk_api.yaml", `${voisonaDocsBaseUrl}/`).toString();

  const [voicevoxJsonText, voisonaYamlText] = await Promise.all([
    fetchText(voicevoxSchemaUrl),
    fetchText(voisonaSchemaUrl, {
      authorization: basicAuthHeader(voisonaUsername, voisonaPassword),
    }),
  ]);

  const voicevoxSchema = JSON.parse(voicevoxJsonText) as unknown;
  assertVoicevoxSchema(voicevoxSchema);
  assertVoiSonaSchema(voisonaYamlText);

  const voicevoxDir = path.join(openapiRoot, "voicevox");
  const voisonaDir = path.join(openapiRoot, "voisona");
  await Promise.all([ensureDir(voicevoxDir), ensureDir(voisonaDir)]);

  await Promise.all([
    fs.writeFile(
      path.join(voicevoxDir, "openapi.json"),
      `${JSON.stringify(voicevoxSchema, null, 2)}\n`,
      "utf8",
    ),
    fs.writeFile(path.join(voisonaDir, "openapi.yaml"), voisonaYamlText, "utf8"),
  ]);

  console.log(
    JSON.stringify(
      {
        voicevox: {
          output: path.join("openapi", "voicevox", "openapi.json"),
          source: voicevoxSchemaUrl,
        },
        voisona: {
          output: path.join("openapi", "voisona", "openapi.yaml"),
          source: voisonaSchemaUrl,
        },
      },
      null,
      2,
    ),
  );
}

await main();
