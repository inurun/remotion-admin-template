import type { TransitionFormValues } from "@/app/features/page/model/transition-form-schema";
import type { TransitionVariant } from "@/_schemas";

export function createBlankTransitionInput({
  id,
  variant,
}: {
  id: string;
  variant: TransitionVariant;
}): TransitionFormValues {
  return {
    id,
    type: "transition",
    variant,
  };
}
