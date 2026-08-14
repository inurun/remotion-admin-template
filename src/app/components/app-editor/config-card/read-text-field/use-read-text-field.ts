import { useFormContext } from "react-hook-form";
import type { DraftProject } from "@/_schemas";
import { useSelectedPage } from "@/app/features/page";
import { useSelectedTts } from "@/app/features/tts";

export function useReadTextField() {
  const { control } = useFormContext<DraftProject>();
  const { selectedPageIndex } = useSelectedPage();
  const { selectedTtsIndex } = useSelectedTts();

  return {
    control,
    name: `pages.${selectedPageIndex}.tts.${selectedTtsIndex}.readText` as const,
  };
}
