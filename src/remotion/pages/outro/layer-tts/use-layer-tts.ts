import { usePageTtsSegments } from "@/remotion/pages/use-page-tts-segments";
import { useOutroPageContext } from "../context";

export function useLayerTts() {
  const { page } = useOutroPageContext();
  return usePageTtsSegments(page);
}
