import { useEffect, useState } from "react";
import type { SavedProject } from "@/_schemas";
import type { ComponentType } from "react";

export function useRemotionComposition() {
  const [component, setComponent] = useState<ComponentType<{ project: SavedProject }> | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("@/remotion/core/composition").then((module) => {
      if (!cancelled) {
        setComponent(() => module.Composition);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return component;
}
