import { createServer, type InlineConfig, type Plugin, type ViteDevServer } from "vite";

/**
 * Serves the video bundle from a second, embedded Vite instance under `base`,
 * so `pnpm dev` alone serves both the admin and the HF preview composition.
 */
export const hyperframesPreviewPlugin = (createConfig: () => InlineConfig): Plugin => ({
  name: "hyperframes-preview",
  apply: "serve",
  configureServer(server) {
    if (process.env["VITEST"]) {
      return;
    }
    const config = createConfig();
    const base = config.base ?? "/";
    let hf: Promise<ViteDevServer> | null = null;
    const getServer = () =>
      (hf ??= createServer({
        ...config,
        appType: "custom",
        server: {
          middlewareMode: true,
          // Share the admin's HTTP server; the client connects at `base`.
          hmr: server.httpServer ? { server: server.httpServer } : false,
          watch: server.config.server.watch,
        },
      }));

    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith(base)) {
        next();
        return;
      }
      getServer().then((hfServer) => hfServer.middlewares(req, res, next), next);
    });
    server.httpServer?.once("close", () => {
      void hf?.then((hfServer) => hfServer.close());
    });
  },
});
