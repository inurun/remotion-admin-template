import { easeCubicIn, easeCubicInOut, easeCubicOut, easeLinear } from "d3-ease";
import type { SlideDirection } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import type { TransitionVariant } from "@/_schemas";

type TransitionEasingName = "linear" | "easeIn" | "easeOut" | "easeInOut";

export type TransitionVariantDef = {
  direction: SlideDirection;
  easing: TransitionEasingName;
};

const EASINGS: Record<TransitionEasingName, (input: number) => number> = {
  linear: easeLinear,
  easeIn: easeCubicIn,
  easeOut: easeCubicOut,
  easeInOut: easeCubicInOut,
};

const TRANSITION_VARIANTS = {
  slide: {
    direction: "from-top",
    easing: "easeInOut",
  },
} as const satisfies Record<TransitionVariant, TransitionVariantDef>;

export function getTransitionVariantDef(variant: TransitionVariant): TransitionVariantDef {
  return TRANSITION_VARIANTS[variant];
}

export function getTransitionEasing(variant: TransitionVariant): (input: number) => number {
  return EASINGS[getTransitionVariantDef(variant).easing];
}
