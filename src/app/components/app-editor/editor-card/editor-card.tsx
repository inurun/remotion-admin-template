import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/app/components/ui/collapsible";
import { PageList } from "@/app/components/app-editor/editor-card/page-list/page-list";
import { PageContent } from "@/app/components/app-editor/editor-card/page-content/page-content";
import { PageHeader } from "@/app/components/app-editor/editor-card/page-header/page-header";
import { EndcardEditor } from "@/app/components/app-editor/editor-card/endcard-editor/endcard-editor";
import { OutroBlocks } from "@/app/components/app-editor/editor-card/outro-blocks/outro-blocks";
import { TtsList } from "@/app/components/app-editor/editor-card/tts-list/tts-list";
import { CommentsEditor } from "@/app/components/app-editor/editor-card/comments-editor/comments-editor";
import { CommentsZenRoot } from "@/app/components/app-editor/editor-card/page-header/comments-zen-dialog/comments-zen-dialog";
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

  if (type === "comments") {
    return (
      <CommentsZenRoot>
        <PageHeader />
        <CommentsEditor />
      </CommentsZenRoot>
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
    <Collapsible open={open} onOpenChange={onOpenChange} className="flex h-full min-h-0 flex-col">
      <Card className="h-full min-h-0">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-xl">Editor</CardTitle>
            <div className="flex items-center gap-1">
              <ZenDialog />
              <PanelCollapseTrigger />
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent className="min-h-0 flex-1 overflow-hidden">
          <CardContent className="h-full min-h-0 overflow-hidden">
            <div className="grid h-full min-h-0 gap-4 sm:grid-cols-[minmax(50px,150px)_minmax(200px,1fr)]">
              <PageList />
              {showPageForm && selectedPageId && selectedPageType ? (
                <SelectedPageContextProvider pageId={selectedPageId}>
                  <PageSwitchFade
                    pageId={selectedPageId}
                    className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain"
                  >
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
