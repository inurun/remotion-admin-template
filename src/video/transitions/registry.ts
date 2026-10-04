import { slide, type TransitionPresentation } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import type { TransitionVariant } from "@/_schemas";
import { getTransitionVariantDef } from "./variants";

export function getTransitionPresentation(variant: TransitionVariant): TransitionPresentation {
  const def = getTransitionVariantDef(variant);

  switch (variant) {
    case "slide":
      return slide({ direction: def.direction });
  }
}
