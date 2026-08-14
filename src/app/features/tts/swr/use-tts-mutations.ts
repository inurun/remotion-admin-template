import { toast } from "sonner";
import useSWRMutation from "swr/mutation";
import type { DraftTts } from "@/_schemas";
import { requestTextAnalysis } from "@/app/features/tts/api/tts-api";

type AnalyzeTextArg = {
  item: DraftTts;
};

async function analyzeTextMutation(_key: string, { arg }: { arg: AnalyzeTextArg }) {
  return requestTextAnalysis(arg.item);
}

export function useAnalyzeTextMutation() {
  return useSWRMutation("tts-analysis", analyzeTextMutation, {
    onError(error, key, config) {
      console.error(error, key, config);
      toast.error("analyze failed");
    },
  });
}
