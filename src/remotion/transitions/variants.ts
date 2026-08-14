import { Easing } from "remotion";
import type { SlideDirection } from "@remotion/transitions/slide";
import type { TransitionVariant } from "@/_schemas";

type TransitionEasingName = "linear" | "easeIn" | "easeOut" | "easeInOut";

export type TransitionVariantDef = {
  durationSec: number;
  direction: SlideDirection;
  easing: TransitionEasingName;
};

const EASINGS: Record<TransitionEasingName, (input: number) => number> = {
  linear: Easing.linear,
  easeIn: Easing.in(Easing.cubic),
  easeOut: Easing.out(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
};

const TRANSITION_VARIANTS = {
  slide: {
    durationSec: 0.8,
    direction: "from-top",
    easing: "easeInOut",
  },
} as const satisfies Record<TransitionVariant, TransitionVariantDef>;

export function getTransitionVariantDef(variant: TransitionVariant): TransitionVariantDef {
  return TRANSITION_VARIANTS[variant];
}

export function getTransitionDurationSec(variant: TransitionVariant): number {
  return getTransitionVariantDef(variant).durationSec;
}

export function getTransitionEasing(variant: TransitionVariant): (input: number) => number {
  return EASINGS[getTransitionVariantDef(variant).easing];
}
