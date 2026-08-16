import { useFormContext, useWatch } from "react-hook-form";
import type { DraftProject, G2pItem } from "@/_schemas";
import { useSelectedPage } from "@/app/features/page";
import { useSelectedTts } from "@/app/features/tts";

export function useAnalysisField() {
  const { selectedPageIndex } = useSelectedPage();
  const { selectedTtsIndex } = useSelectedTts();
  const name = `pages.${selectedPageIndex}.tts.${selectedTtsIndex}.speech.g2p` as const;
  const providerName = `pages.${selectedPageIndex}.tts.${selectedTtsIndex}.provider` as const;
  const { control, setValue } = useFormContext<DraftProject>();
  const value = useWatch({ control, name });
  const provider = useWatch({ control, name: providerName });

  return {
    provider,
    value,
    onChange: (nextValue: G2pItem) => {
      setValue(name, nextValue, { shouldDirty: true });
    },
  };
}
