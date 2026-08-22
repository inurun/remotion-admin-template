import { toast } from "sonner";
import useSWRMutation from "swr/mutation";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import type { TtsLlmAnalysisRequest } from "@/server/features/tts/contract";
import { getErrorMessage } from "@/_shared/lib/error-message";
import { requestPageLlmAnalysis, requestTextAnalysis } from "@/app/features/tts/api/tts-api";

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

async function llmAnalyzeMutation(_key: string, { arg }: { arg: TtsLlmAnalysisRequest }) {
  return requestPageLlmAnalysis(arg);
}

export function useLlmAnalyzeMutation() {
  return useSWRMutation("tts-llm-analysis", llmAnalyzeMutation, {
    onError(error, key, config) {
      console.error(error, key, config);
      toast.error(getErrorMessage(error, "LLM G2P failed"));
    },
  });
}
