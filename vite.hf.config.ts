import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type InlineConfig } from "vite";
import { hyperframesJsx } from "@inurun/vite-plugin-hyperframes-jsx";
import { HF_BUNDLE_BASE, HF_ENTRY } from "./src/video-host/constants";

/**
 * The video bundle: a separate Vite instance from the admin, whose JSX is `@inurun/vite-plugin-hyperframes-jsx`.
 * Dev: embedded in the admin dev server (`scripts/vite/hyperframes-preview-plugin`).
 * Prod: `vite build -c vite.hf.config.ts` → `dist/hf`, served as static files.
 */
export function createHfViteConfig(): InlineConfig {
  return {
    configFile: false,
    root: __dirname,
    base: HF_BUNDLE_BASE,
    envDir: __dirname,
    publicDir: false,
    plugins: [tailwindcss(), hyperframesJsx()],
    // lottie-web is UMD: pre-bundle it for dev; everything else is served as ESM.
    optimizeDeps: { noDiscovery: true, include: ["lottie-web"] },
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    build: {
      outDir: path.resolve(__dirname, "dist/hf"),
      emptyOutDir: true,
      manifest: true,
      assetsInlineLimit: 0,
      modulePreload: false,
      rollupOptions: { input: path.resolve(__dirname, HF_ENTRY) },
    },
  };
}

export default defineConfig(createHfViteConfig());
