import { useFormContext, useWatch } from "react-hook-form";
import type { DraftProject, DraftTts } from "@/_schemas";
import { usePage } from "@/app/features/page";
import { useTts } from "@/app/features/tts";

export function useConfigCard() {
  const { selectedPageIndex } = usePage();
  const { selectedTtsIndex } = useTts();
  const { control } = useFormContext<DraftProject>();
  const watchDisabled = selectedPageIndex === null || selectedTtsIndex === null;
  const selectedTts = useWatch({
    control,
    disabled: watchDisabled,
    name: `pages.${selectedPageIndex ?? 0}.tts.${selectedTtsIndex ?? 0}`,
  });

  return {
    selectedPageIndex,
    selectedTtsIndex,
    selectedTts: watchDisabled ? null : ((selectedTts as DraftTts | undefined) ?? null),
  };
}
