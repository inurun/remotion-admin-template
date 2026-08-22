import { useCallback } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useSelectedTts, useTts } from "@/app/features/tts";
import { useTtsFormIndex } from "@/app/features/tts/lib/use-tts-form-index";

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
  const { analyze, analyzeWithLlm, canRunTts, isAnalyzing, isLlmAnalyzing, preview } = useTts();
  const { ttsId } = useSelectedTts();
  const ttsIndex = useTtsFormIndex(ttsId);
  const { control } = useFormContext<PageFormValues>();
  const text = useWatch({
    control,
    name: `tts.${Math.max(ttsIndex, 0)}.text`,
  });
  const voiceName = useWatch({
    control,
    name: `tts.${Math.max(ttsIndex, 0)}.voiceName`,
  });
  const provider = useWatch({
    control,
    name: `tts.${Math.max(ttsIndex, 0)}.provider`,
  });
  const actionDisabled = ttsIndex < 0 || isVoiceActionDisabled({ canRunTts, text, voiceName });
  const busy = isAnalyzing || isLlmAnalyzing;

  const analyzeSelected = useCallback(() => {
    void analyze(ttsId);
  }, [analyze, ttsId]);

  const llmAnalyzeSelected = useCallback(() => {
    void analyzeWithLlm(ttsId);
  }, [analyzeWithLlm, ttsId]);

  const previewSelected = useCallback(() => {
    void preview(ttsId);
  }, [preview, ttsId]);

  return {
    analyzeSelected,
    analyzeDisabled: actionDisabled || busy,
    isAnalyzing,
    llmAnalyzeSelected,
    llmAnalyzeDisabled: actionDisabled || busy || provider === "voicepeak",
    isLlmAnalyzing,
    previewDisabled: actionDisabled,
    previewSelected,
  };
}
