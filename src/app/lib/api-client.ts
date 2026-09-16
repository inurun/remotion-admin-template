import type { ApiApp } from "@/server/core/api";
import { hc } from "hono/client";

export const api = hc<ApiApp>("/api");
