import type { AssetFile, AssetPath } from "./types";

export type { AssetFile, AssetPath };

export const assetPath = (file: AssetFile): AssetPath => `/${file}` as AssetPath;
