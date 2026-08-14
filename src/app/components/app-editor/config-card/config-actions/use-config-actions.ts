import { useCallback } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { DraftProject } from "@/_schemas";
import { useSelectedPage } from "@/app/features/page";
import { useSelectedTts, useTts } from "@/app/features/tts";

function isVoiceActionDisabled({
  canRunTts,
  text,
  voiceName,
}: {
  canRunTts: boolean;
  text?: string;
  voiceName?: string;
}) {
  return [canRunTts, Boolean((text ?? "").trim()), Boolean(voiceName)].some(
    (condition) => !condition,
  );
}

export function useConfigTtsActions() {
  const { analyze, canRunTts, isAnalyzing, preview } = useTts();
  const { selectedPageIndex } = useSelectedPage();
  const { selectedTtsIndex } = useSelectedTts();
  const { control } = useFormContext<DraftProject>();
  const text = useWatch({
    control,
    name: `pages.${selectedPageIndex}.tts.${selectedTtsIndex}.text`,
  });
  const voiceName = useWatch({
    control,
    name: `pages.${selectedPageIndex}.tts.${selectedTtsIndex}.voiceName`,
  });
  const actionDisabled = isVoiceActionDisabled({ canRunTts, text, voiceName });

  const analyzeSelected = useCallback(() => {
    void analyze(selectedPageIndex, selectedTtsIndex);
  }, [analyze, selectedPageIndex, selectedTtsIndex]);

  const previewSelected = useCallback(() => {
    void preview(selectedPageIndex, selectedTtsIndex);
  }, [preview, selectedPageIndex, selectedTtsIndex]);

  return {
    analyzeSelected,
    analyzeDisabled: actionDisabled || isAnalyzing,
    isAnalyzing,
    previewDisabled: actionDisabled,
    previewSelected,
  };
}
