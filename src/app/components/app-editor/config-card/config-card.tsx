import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/_shared/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/_shared/components/ui/collapsible";
import { SelectedTtsContextProvider } from "@/app/features/tts";
import { ConfigActions } from "@/app/components/app-editor/config-card/config-actions/config-actions";
import { ReadTextField } from "@/app/components/app-editor/config-card/read-text-field/read-text-field";
import { AnalysisField } from "@/app/components/app-editor/config-card/analysis-field/analysis-field";
import { AvatarSettingsField } from "@/app/components/app-editor/config-card/avatar-settings-field/avatar-settings-field";
import { PanelCollapseTrigger } from "@/app/components/app-editor/panel-collapse-trigger/panel-collapse-trigger";
import { usePanelOpen } from "@/app/components/app-editor/use-panel-open";
import {
  useConfigCard,
  useConfigCardVisibility,
} from "@/app/components/app-editor/config-card/use-config-card";
import { PageSwitchFade } from "@/app/components/app-editor/page-switch-fade/page-switch-fade";

function ConfigCardShell({ children }: { children: ReactNode }) {
  const { open, onOpenChange } = usePanelOpen("config");

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl">Config</CardTitle>
            <PanelCollapseTrigger />
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="grid gap-4">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function EmptyConfig() {
  return (
    <ConfigCardShell>
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        tts を選ぶと Read と analysis を編集できる。
      </div>
    </ConfigCardShell>
  );
}

function ConfigCardInner() {
  const { selectedTtsId, selectedTts } = useConfigCard();

  return (
    <ConfigCardShell>
      {!selectedTtsId || !selectedTts ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          tts を選ぶと Read と analysis を編集できる。
        </div>
      ) : (
        <SelectedTtsContextProvider key={selectedTts.id} ttsId={selectedTts.id}>
          <div className="grid gap-4">
            <AvatarSettingsField />
            <ConfigActions />
            <ReadTextField />
            <AnalysisField />
          </div>
        </SelectedTtsContextProvider>
      )}
    </ConfigCardShell>
  );
}

export function ConfigCard() {
  const { pageId, showPageForm } = useConfigCardVisibility();
  const content = showPageForm ? <ConfigCardInner /> : <EmptyConfig />;
  if (!pageId) {
    return content;
  }
  return <PageSwitchFade pageId={pageId}>{content}</PageSwitchFade>;
}
