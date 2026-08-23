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
  getConfigPaneClassName,
  getEditorColumnClassName,
  getPreviewConfigColumnClassName,
  getPreviewPaneClassName,
} from "@/app/components/app-editor/app-editor.lib";
import {
  useAppEditorLayout,
  useDesktopEditorLayout,
} from "@/app/components/app-editor/use-app-editor-layout";
import { useAppEditorPanels } from "@/app/components/app-editor/use-app-editor-panels";
import { useAppEditor } from "@/app/components/app-editor/use-app-editor";
import { PageEditorProviders } from "@/app/components/app-editor/page-editor-providers/page-editor-providers";

function EditorColumn() {
  return (
    <section className={getEditorColumnClassName()}>
      <EditorCard />
    </section>
  );
}

function PreviewConfigColumn({
  fillHeight = false,
  configOpen,
}: {
  fillHeight?: boolean;
  configOpen: boolean;
}) {
  return (
    <section className={getPreviewConfigColumnClassName(fillHeight)}>
      <div className={getPreviewPaneClassName()}>
        <PreviewCard />
      </div>
      <div className={getConfigPaneClassName(fillHeight, configOpen)}>
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
  const { configOpen, editorPanelRef } = useAppEditorPanels();

  return (
    <PageEditorProviders>
      <div className="h-full min-h-0">
        {isDesktop ? (
          <ResizablePanelGroup
            id={id}
            orientation="horizontal"
            className="h-full min-h-0 w-full"
            defaultLayout={defaultLayout}
            onLayoutChanged={onLayoutChanged}
          >
            <ResizablePanel
              id="editor"
              panelRef={editorPanelRef}
              collapsible
              collapsedSize={72}
              defaultSize="70%"
              minSize="40%"
              className="min-h-0 min-w-0 overflow-hidden"
            >
              <EditorColumn />
            </ResizablePanel>
            <ResizableHandle withHandle className="mx-2.5 self-stretch" />
            <ResizablePanel
              id="preview-config"
              defaultSize="30%"
              minSize="20%"
              maxSize="50%"
              className="min-h-0 overflow-hidden"
            >
              <PreviewConfigColumn fillHeight configOpen={configOpen} />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto">
            <EditorColumn />
            <PreviewConfigColumn configOpen={configOpen} />
          </div>
        )}
      </div>
    </PageEditorProviders>
  );
}
