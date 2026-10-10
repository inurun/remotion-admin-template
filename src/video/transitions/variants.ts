import type { TransitionVariant } from "@/_schemas";

export type SlideDirection = "from-left" | "from-right" | "from-top" | "from-bottom";

export type TransitionVariantDef = {
  direction: SlideDirection;
  /** A GSAP ease. */
  ease: string;
};

const TRANSITION_VARIANTS = {
  slide: {
    direction: "from-top",
    ease: "power2.inOut",
  },
} as const satisfies Record<TransitionVariant, TransitionVariantDef>;

export function getTransitionVariantDef(variant: TransitionVariant): TransitionVariantDef {
  return TRANSITION_VARIANTS[variant];
}
