import { useFormContext, useWatch } from "react-hook-form";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useTts } from "@/app/features/tts";

export function useConfigCard() {
  const { selectedTtsId } = useTts();
  const { control } = useFormContext<PageFormValues>();
  const tts = useWatch({ control, name: "tts" }) ?? [];
  const selectedTts = tts.find((item) => item.id === selectedTtsId) ?? null;

  return {
    selectedTtsId,
    selectedTts,
  };
}
