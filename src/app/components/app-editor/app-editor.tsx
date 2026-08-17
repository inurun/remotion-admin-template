import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/_shared/components/ui/resizable";
import { cn } from "@/_shared/lib/utils";
import { ConfigCard } from "@/app/components/app-editor/config-card/config-card";
import { EditorCard } from "@/app/components/app-editor/editor-card/editor-card";
import { PreviewCard } from "./preview-card/preview-card";
import { useAppEditorHotkeys } from "@/app/components/app-editor/app-editor.hotkeys";
import { useAppEditorLayout } from "@/app/components/app-editor/use-app-editor-layout";
import { useAppEditor } from "@/app/components/app-editor/use-app-editor";
import { PageEditorProviders } from "@/app/components/app-editor/page-editor-providers/page-editor-providers";

function EditorColumn() {
  return (
    <section className="flex max-w-full flex-col gap-4 overflow-hidden">
      <EditorCard />
    </section>
  );
}

function PreviewConfigColumn({ sticky = false }: { sticky?: boolean }) {
  return (
    <section className={cn("flex flex-col gap-4", sticky && "sticky top-6")}>
      <PreviewCard />
      <ConfigCard />
    </section>
  );
}

export function AppEditor() {
  useAppEditor();
  useAppEditorHotkeys();
  const { defaultLayout, id, onLayoutChanged } = useAppEditorLayout();

  return (
    <PageEditorProviders>
      <div className="flex flex-col gap-5 lg:hidden">
        <EditorColumn />
        <PreviewConfigColumn />
      </div>

      <ResizablePanelGroup
        id={id}
        orientation="horizontal"
        className="hidden! h-auto! w-full items-start lg:flex!"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
      >
        <ResizablePanel
          id="editor"
          defaultSize="70%"
          minSize="40%"
          className="min-w-0 overflow-hidden"
        >
          <EditorColumn />
        </ResizablePanel>
        <ResizableHandle withHandle className="mx-2.5 self-stretch" />
        <ResizablePanel
          id="preview-config"
          defaultSize="30%"
          minSize="20%"
          maxSize="50%"
          className="overflow-visible!"
        >
          <PreviewConfigColumn sticky />
        </ResizablePanel>
      </ResizablePanelGroup>
    </PageEditorProviders>
  );
}
