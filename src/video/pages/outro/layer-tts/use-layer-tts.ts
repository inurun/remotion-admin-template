import { usePageTtsSegments } from "@/video/pages/use-page-tts-segments";
import { useOutroPageContext } from "../context";

export function useLayerTts() {
  const { page } = useOutroPageContext();
  return usePageTtsSegments(page);
}
