import { Card, CardContent, CardHeader, CardTitle } from "@/_shared/components/ui/card";
import { SelectedTtsContextProvider } from "@/app/features/tts";
import { ConfigActions } from "@/app/components/app-editor/config-card/config-actions/config-actions";
import { ReadTextField } from "@/app/components/app-editor/config-card/read-text-field/read-text-field";
import { AnalysisField } from "@/app/components/app-editor/config-card/analysis-field/analysis-field";
import { AvatarSettingsField } from "@/app/components/app-editor/config-card/avatar-settings-field/avatar-settings-field";
import { TtsPlaybackSettingsField } from "@/app/components/app-editor/config-card/tts-playback-settings-field/tts-playback-settings-field";
import { useConfigCard } from "@/app/components/app-editor/config-card/use-config-card";
import { usePageEditorProviders } from "@/app/components/app-editor/page-editor-providers/use-page-editor-providers";

function EmptyConfig() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Config</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          tts を選ぶと Read と analysis を編集できる。
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigCardInner() {
  const { selectedTtsId, selectedTts } = useConfigCard();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Config</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!selectedTtsId || !selectedTts ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            tts を選ぶと Read と analysis を編集できる。
          </div>
        ) : (
          <SelectedTtsContextProvider key={selectedTts.id} ttsId={selectedTts.id}>
            <div className="grid gap-4">
              <ReadTextField />
              <AvatarSettingsField />
              <TtsPlaybackSettingsField />
              <ConfigActions />
              <AnalysisField />
            </div>
          </SelectedTtsContextProvider>
        )}
      </CardContent>
    </Card>
  );
}

export function ConfigCard() {
  const { isContentPage } = usePageEditorProviders();
  if (!isContentPage) {
    return <EmptyConfig />;
  }
  return <ConfigCardInner />;
}
