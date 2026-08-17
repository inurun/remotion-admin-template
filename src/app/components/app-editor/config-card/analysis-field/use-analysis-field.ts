import { useFormContext, useWatch } from "react-hook-form";
import type { G2pItem } from "@/_schemas";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useSelectedTts } from "@/app/features/tts";
import { useTtsFormIndex } from "@/app/features/tts/lib/use-tts-form-index";

export function useAnalysisField() {
  const { ttsId } = useSelectedTts();
  const ttsIndex = Math.max(useTtsFormIndex(ttsId), 0);
  const name = `tts.${ttsIndex}.speech.g2p` as const;
  const providerName = `tts.${ttsIndex}.provider` as const;
  const { control, setValue } = useFormContext<PageFormValues>();
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
