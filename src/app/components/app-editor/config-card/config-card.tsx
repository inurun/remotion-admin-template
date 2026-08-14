import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/_shared/components/ui/card";
import type { DraftProject } from "@/_schemas";
import { isDraftContentPage } from "@/_schemas";
import { usePage, SelectedPageContextProvider } from "@/app/features/page";
import { useTts, SelectedTtsContextProvider } from "@/app/features/tts";
import { ConfigActions } from "@/app/components/app-editor/config-card/config-actions/config-actions";
import { ReadTextField } from "@/app/components/app-editor/config-card/read-text-field/read-text-field";
import { AnalysisField } from "@/app/components/app-editor/config-card/analysis-field/analysis-field";
import { AvatarSettingsField } from "@/app/components/app-editor/config-card/avatar-settings-field/avatar-settings-field";
import { TtsPlaybackSettingsField } from "@/app/components/app-editor/config-card/tts-playback-settings-field/tts-playback-settings-field";

export function ConfigCard() {
  const { selectedPageIndex } = usePage();
  const { selectedTtsIndex } = useTts();
  const { control } = useFormContext<DraftProject>();
  const pages = useWatch({ control, name: "pages" });
  const selectedItem = selectedPageIndex !== null ? (pages?.[selectedPageIndex] ?? null) : null;
  const selectedTts =
    selectedItem &&
    isDraftContentPage(selectedItem) &&
    selectedPageIndex !== null &&
    selectedTtsIndex !== null
      ? (selectedItem.tts[selectedTtsIndex] ?? null)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Config</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {selectedPageIndex === null || selectedTtsIndex === null || !selectedTts ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            tts を選ぶと Read と TSML を編集できる。
          </div>
        ) : (
          <SelectedPageContextProvider pageIndex={selectedPageIndex}>
            <SelectedTtsContextProvider
              key={`${selectedPageIndex}-${selectedTts.id}`}
              ttsIndex={selectedTtsIndex}
            >
              <div className="grid gap-4">
                <ReadTextField />
                <AvatarSettingsField />
                <TtsPlaybackSettingsField />
                <ConfigActions />
                <AnalysisField />
              </div>
            </SelectedTtsContextProvider>
          </SelectedPageContextProvider>
        )}
      </CardContent>
    </Card>
  );
}
