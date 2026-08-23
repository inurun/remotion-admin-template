import { Card, CardContent, CardHeader, CardTitle } from "@/_shared/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/_shared/components/ui/collapsible";
import { PageList } from "@/app/components/app-editor/editor-card/page-list/page-list";
import { PageContent } from "@/app/components/app-editor/editor-card/page-content/page-content";
import { PageHeader } from "@/app/components/app-editor/editor-card/page-header/page-header";
import { EndcardEditor } from "@/app/components/app-editor/editor-card/endcard-editor/endcard-editor";
import { OutroBlocks } from "@/app/components/app-editor/editor-card/outro-blocks/outro-blocks";
import { TtsList } from "@/app/components/app-editor/editor-card/tts-list/tts-list";
import { ZenDialog } from "@/app/components/app-editor/editor-card/zen-dialog/zen-dialog";
import { PageSwitchFade } from "@/app/components/app-editor/page-switch-fade/page-switch-fade";
import { PanelCollapseTrigger } from "@/app/components/app-editor/panel-collapse-trigger/panel-collapse-trigger";
import { usePanelOpen } from "@/app/components/app-editor/use-panel-open";
import { SelectedPageContextProvider } from "@/app/features/page";
import { useEditorCard } from "@/app/components/app-editor/editor-card/use-editor-card";
import type { PageType } from "@/_schemas";

function SelectedPageEditor({ type }: { type: PageType }) {
  if (type === "intro" || type === "eyecatch-text") {
    return (
      <>
        <PageHeader />
        <TtsList />
      </>
    );
  }

  if (type === "outro") {
    return (
      <>
        <PageHeader />
        <OutroBlocks />
      </>
    );
  }

  if (type === "endcard") {
    return (
      <>
        <PageHeader />
        <EndcardEditor />
      </>
    );
  }

  return (
    <>
      <PageHeader />
      <PageContent />
      <TtsList />
    </>
  );
}

export function EditorCard() {
  const { selectedPageId, selectedPageType, selectedTransitionVariant, showPageForm } =
    useEditorCard();
  const { open, onOpenChange } = usePanelOpen("editor");

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-xl">Editor</CardTitle>
            <div className="flex items-center gap-1">
              <ZenDialog />
              <PanelCollapseTrigger />
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-[minmax(50px,180px)_minmax(200px,1fr)]">
              <PageList />
              {showPageForm && selectedPageId && selectedPageType ? (
                <SelectedPageContextProvider pageId={selectedPageId}>
                  <PageSwitchFade pageId={selectedPageId} className="flex flex-col gap-2">
                    {selectedPageType === "transition" ? (
                      <>
                        <PageHeader />
                        <p className="text-sm text-muted-foreground">{selectedTransitionVariant}</p>
                      </>
                    ) : (
                      <SelectedPageEditor type={selectedPageType} />
                    )}
                  </PageSwitchFade>
                </SelectedPageContextProvider>
              ) : null}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
