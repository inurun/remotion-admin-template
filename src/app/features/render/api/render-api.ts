import { api } from "@/_shared/lib/api-client";
import { parseApiJson } from "@/_shared/lib/fetch-json";

export type RenderState = {
  lastError: string | null;
  progress: number;
  status: "canceled" | "error" | "idle" | "running" | "success";
  updatedAt?: number;
  videoPath: string | null;
};

export const RENDER_STREAM_URL = "/api/render/stream";

export const renderKeys = {
  snapshot: () => ["render"] as const,
};

export async function fetchRenderState() {
  return parseApiJson<RenderState>(await api.render.$get());
}

export async function startRender(projectPath: string) {
  const response = await api.render.$post({
    json: { projectPath },
  });
  const data = (await response.json()) as { error?: string; started?: boolean };

  if (!response.ok || !data.started) {
    throw new Error(data.error ?? "Render start failed");
  }
}

export async function cancelRender() {
  const response = await api.render.cancel.$post();
  const data = (await response.json()) as { canceled?: boolean; error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Render cancel failed");
  }
}
