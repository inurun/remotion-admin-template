import { Card, CardContent, CardHeader, CardTitle } from "@/_shared/components/ui/card";
import { PageList } from "@/app/components/app-editor/editor-card/page-list/page-list";
import { PageContent } from "@/app/components/app-editor/editor-card/page-content/page-content";
import { PageHeader } from "@/app/components/app-editor/editor-card/page-header/page-header";
import { OutroBlocks } from "@/app/components/app-editor/editor-card/outro-blocks/outro-blocks";
import { TtsList } from "@/app/components/app-editor/editor-card/tts-list/tts-list";
import { ZenDialog } from "@/app/components/app-editor/editor-card/zen-dialog/zen-dialog";
import { SelectedPageContextProvider, usePage } from "@/app/features/page";

function SelectedPageEditor({ type }: { type: "intro" | "main" | "outro" }) {
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

  return (
    <>
      <PageHeader />
      <PageContent />
      <TtsList />
    </>
  );
}

export function EditorCard() {
  const { pageFields, selectedPageIndex } = usePage();
  const selectedPage = selectedPageIndex !== null ? pageFields[selectedPageIndex] : undefined;

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
          {selectedPageIndex !== null && selectedPage && (
            <SelectedPageContextProvider pageIndex={selectedPageIndex}>
              <div key={selectedPage.id} className="flex flex-col gap-2">
                {selectedPage.type === "transition" ? (
                  <>
                    <PageHeader />
                    <p className="text-sm text-muted-foreground">{selectedPage.variant}</p>
                  </>
                ) : (
                  <SelectedPageEditor type={selectedPage.type} />
                )}
              </div>
            </SelectedPageContextProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
