import { useFormContext, useWatch } from "react-hook-form";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { usePageEditorProviders } from "@/app/components/app-editor/page-editor-providers/use-page-editor-providers";
import { usePageFormScope } from "@/app/features/page/context/page-form-context";
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

export function useConfigCardVisibility() {
  const { isContentPage, pageId } = usePageEditorProviders();
  const { isReady } = usePageFormScope();
  return {
    pageId,
    showPageForm: isContentPage && isReady,
  };
}
