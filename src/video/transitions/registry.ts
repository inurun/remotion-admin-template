import type { TransitionVariant } from "@/_schemas";
import type { TransitionAnimation } from "@inurun/frame-animation/hyperframes";
import { getTransitionVariantDef, type SlideDirection } from "./variants";

/** Where the entering scene starts, in percent of its own size. */
const SLIDE_ORIGIN = {
  "from-left": { axis: "xPercent", start: -100 },
  "from-right": { axis: "xPercent", start: 100 },
  "from-top": { axis: "yPercent", start: -100 },
  "from-bottom": { axis: "yPercent", start: 100 },
} as const satisfies Record<SlideDirection, { axis: string; start: number }>;

/** The entering scene pushes the exiting one out along the same axis. */
function slide(direction: SlideDirection, ease: string): TransitionAnimation {
  const { axis, start } = SLIDE_ORIGIN[direction];
  return (tl, { exiting, entering }, at, duration) => {
    tl.fromTo(entering, { [axis]: start }, { [axis]: 0, duration, ease }, at);
    // The exiting scene may have slid in earlier: start this tween only when it plays.
    tl.fromTo(
      exiting,
      { [axis]: 0 },
      { [axis]: -start, duration, ease, immediateRender: false },
      at,
    );
  };
}

export function getTransitionAnimation(variant: TransitionVariant): TransitionAnimation {
  const def = getTransitionVariantDef(variant);
  switch (variant) {
    case "slide":
      return slide(def.direction, def.ease);
  }
}
