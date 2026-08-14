import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import build from "@hono/vite-build/node";
import devServer, { defaultOptions } from "@hono/vite-dev-server";
import { assetsCodegenPlugin } from "./scripts/assets/codegen-plugin";
import { serveRuntimePublicAssetsPlugin } from "./scripts/vite/serve-runtime-public-assets-plugin";
import ssrPlugin from "vite-ssr-components/plugin";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  const resolve = {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  };

  if (mode === "server") {
    return {
      resolve,
      plugins: [
        assetsCodegenPlugin(),
        build({
          entry: "./src/index.tsx",
          staticRoot: "./dist",
        }),
      ],
    };
  }

  return {
    server: {
      watch: {
        ignored: ["**/data/**", "**/public/uploads/**"],
      },
    },
    build: {
      emptyOutDir: true,
    },
    envPrefix: ["VITE_", "REMOTION_"],
    plugins: [
      serveRuntimePublicAssetsPlugin(),
      assetsCodegenPlugin(),
      devServer({
        entry: "./src/index.tsx",
        exclude: [/^\/src\/.*\.json(?:\?.*)?$/, ...defaultOptions.exclude],
      }),
      tailwindcss(),
      ssrPlugin(),
      react(),
    ],
    resolve,
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
      coverage: {
        provider: "istanbul",
        reporter: ["json"],
        reportsDirectory: "./coverage",
      },
    },
  };
});
