import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/_shared/components/ui/resizable";
import { ConfigCard } from "@/app/components/app-editor/config-card/config-card";
import { EditorCard } from "@/app/components/app-editor/editor-card/editor-card";
import { PreviewCard } from "./preview-card/preview-card";
import { useAppEditorHotkeys } from "@/app/components/app-editor/app-editor.hotkeys";
import {
  getPreviewConfigColumnClassName,
  getPreviewConfigScrollClassName,
} from "@/app/components/app-editor/app-editor.lib";
import {
  useAppEditorLayout,
  useDesktopEditorLayout,
} from "@/app/components/app-editor/use-app-editor-layout";
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
    <section className={getPreviewConfigColumnClassName(sticky)}>
      <div className="shrink-0">
        <PreviewCard />
      </div>
      <div className={getPreviewConfigScrollClassName(sticky)}>
        <ConfigCard />
      </div>
    </section>
  );
}

export function AppEditor() {
  useAppEditor();
  useAppEditorHotkeys();
  const { defaultLayout, id, onLayoutChanged } = useAppEditorLayout();
  const isDesktop = useDesktopEditorLayout();

  return (
    <PageEditorProviders>
      {isDesktop ? (
        <ResizablePanelGroup
          id={id}
          orientation="horizontal"
          className="h-auto! w-full overflow-visible!"
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
      ) : (
        <div className="flex flex-col gap-5">
          <EditorColumn />
          <PreviewConfigColumn />
        </div>
      )}
    </PageEditorProviders>
  );
}
