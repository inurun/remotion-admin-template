import type { DraftTransition, TransitionVariant } from "@/_schemas";

export function createBlankDraftTransition({
  id,
  variant,
}: {
  id: string;
  variant: TransitionVariant;
}): DraftTransition {
  return {
    id,
    type: "transition",
    variant,
  };
}
