import { Card, CardContent, CardHeader, CardTitle } from "@/_shared/components/ui/card";
import { PageList } from "@/app/components/app-editor/editor-card/page-list/page-list";
import { PageContent } from "@/app/components/app-editor/editor-card/page-content/page-content";
import { PageHeader } from "@/app/components/app-editor/editor-card/page-header/page-header";
import { EndcardEditor } from "@/app/components/app-editor/editor-card/endcard-editor/endcard-editor";
import { OutroBlocks } from "@/app/components/app-editor/editor-card/outro-blocks/outro-blocks";
import { TtsList } from "@/app/components/app-editor/editor-card/tts-list/tts-list";
import { ZenDialog } from "@/app/components/app-editor/editor-card/zen-dialog/zen-dialog";
import { SelectedPageContextProvider } from "@/app/features/page";
import { useEditorSession } from "@/app/features/editor/store/editor-session-store-context";
import { useSelectedPageId } from "@/app/features/project/context/project-route-context";
import type { PageType } from "@/_schemas";

function SelectedPageEditor({ type }: { type: PageType }) {
  if (type === "intro") {
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
  const selectedPageId = useSelectedPageId();
  const selectedPageType = useEditorSession((state) =>
    selectedPageId ? state.itemsById[selectedPageId]?.type : undefined,
  );
  const selectedTransitionVariant = useEditorSession((state) => {
    if (!selectedPageId) {
      return undefined;
    }
    const item = state.itemsById[selectedPageId];
    return item?.type === "transition" ? item.variant : undefined;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl">Editor</CardTitle>
          <ZenDialog />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-[minmax(50px,180px)_minmax(200px,1fr)]">
          <PageList />
          {selectedPageId && selectedPageType ? (
            <SelectedPageContextProvider pageId={selectedPageId}>
              <div key={selectedPageId} className="flex flex-col gap-2">
                {selectedPageType === "transition" ? (
                  <>
                    <PageHeader />
                    <p className="text-sm text-muted-foreground">{selectedTransitionVariant}</p>
                  </>
                ) : (
                  <SelectedPageEditor type={selectedPageType} />
                )}
              </div>
            </SelectedPageContextProvider>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
