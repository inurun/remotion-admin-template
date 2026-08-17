import { useFormContext } from "react-hook-form";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useSelectedTts } from "@/app/features/tts";
import { useTtsFormIndex } from "@/app/features/tts/lib/use-tts-form-index";

export function useReadTextField() {
  const { control } = useFormContext<PageFormValues>();
  const { ttsId } = useSelectedTts();
  const ttsIndex = Math.max(useTtsFormIndex(ttsId), 0);

  return {
    control,
    name: `tts.${ttsIndex}.readText` as const,
  };
}
