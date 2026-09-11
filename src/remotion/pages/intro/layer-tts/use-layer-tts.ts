import { usePageTtsSegments } from "@/remotion/pages/use-page-tts-segments";
import { useIntroPageContext } from "../context";

export function useLayerTts() {
  const { page } = useIntroPageContext();
  return usePageTtsSegments(page);
}
