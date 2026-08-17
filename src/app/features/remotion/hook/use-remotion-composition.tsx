import { useEffect, useState } from "react";
import {
  remotionCompositionLoader,
  type RemotionCompositionComponent,
} from "@/app/features/remotion/hook/remotion-composition-loader";

export function useRemotionComposition() {
  const [component, setComponent] = useState<RemotionCompositionComponent | null>(() =>
    remotionCompositionLoader.peek(),
  );

  useEffect(() => {
    if (component) {
      return;
    }

    let cancelled = false;
    void remotionCompositionLoader.load().then((next) => {
      if (!cancelled) {
        setComponent(() => next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [component]);

  return component;
}
