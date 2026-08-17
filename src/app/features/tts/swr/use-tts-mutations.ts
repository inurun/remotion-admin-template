import { toast } from "sonner";
import useSWRMutation from "swr/mutation";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { getErrorMessage } from "@/_shared/lib/error-message";
import { requestTextAnalysis } from "@/app/features/tts/api/tts-api";

type AnalyzeTextArg = {
  item: TtsFormValues;
};

async function analyzeTextMutation(_key: string, { arg }: { arg: AnalyzeTextArg }) {
  return requestTextAnalysis(arg.item);
}

export function useAnalyzeTextMutation() {
  return useSWRMutation("tts-analysis", analyzeTextMutation, {
    onError(error, key, config) {
      console.error(error, key, config);
      toast.error(getErrorMessage(error, "analyze failed"));
    },
  });
}
