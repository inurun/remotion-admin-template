import type { TransitionPresentation } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import type { TransitionVariant } from "@/_schemas";
import { getTransitionVariantDef } from "./variants";

// Remotion TransitionSeries.Transition accepts presentations with arbitrary passedProps.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTransitionPresentation(variant: TransitionVariant): TransitionPresentation<any> {
  const def = getTransitionVariantDef(variant);

  switch (variant) {
    case "slide":
      return slide({ direction: def.direction });
  }
}
