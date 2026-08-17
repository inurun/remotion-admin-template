import { useFormContext, useWatch } from "react-hook-form";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";

export function useTtsFormIndex(ttsId: string | null) {
  const { control } = useFormContext<PageFormValues>();
  const tts = useWatch({ control, name: "tts" }) ?? [];
  if (!ttsId) {
    return -1;
  }
  return tts.findIndex((item) => item.id === ttsId);
}
