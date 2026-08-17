import type { ComponentType } from "react";
import type { SavedProject } from "@/_schemas";

export type RemotionCompositionComponent = ComponentType<{ project: SavedProject }>;

export function createRemotionCompositionLoader(
  importComposition: () => Promise<{ Composition: RemotionCompositionComponent }>,
) {
  let cached: RemotionCompositionComponent | null = null;
  let pending: Promise<RemotionCompositionComponent> | null = null;

  return {
    peek() {
      return cached;
    },
    load() {
      if (cached) {
        return Promise.resolve(cached);
      }
      if (!pending) {
        pending = importComposition().then((module) => {
          cached = module.Composition;
          return cached;
        });
      }
      return pending;
    },
  };
}

export const remotionCompositionLoader = createRemotionCompositionLoader(
  () => import("@/remotion/core/composition"),
);
