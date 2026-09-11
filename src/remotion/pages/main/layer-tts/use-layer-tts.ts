import { usePageTtsSegments } from "@/remotion/pages/use-page-tts-segments";
import { useMainPageContext } from "../context";

export function useLayerTts() {
  const { page } = useMainPageContext();
  return usePageTtsSegments(page);
}
