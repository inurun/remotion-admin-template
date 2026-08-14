import type { Plugin } from "vite";
import { createAssetGenerator, registerAssetCodegenWatchers } from "./codegen-runtime";

const assetCodegenPluginName = "assets-codegen";

export const assetsCodegenPlugin = (): Plugin => {
  const generate = createAssetGenerator();

  return {
    async buildStart() {
      await generate();
    },
    configureServer(server) {
      registerAssetCodegenWatchers(server, generate);
    },
    name: assetCodegenPluginName,
  };
};
