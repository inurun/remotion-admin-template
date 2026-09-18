import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/app/components/ui/resizable";
import { ConfigCard } from "@/app/components/app-editor/config-card/config-card";
import { EditorCard } from "@/app/components/app-editor/editor-card/editor-card";
import { PreviewCard } from "./preview-card/preview-card";
import { TimelineView } from "@/app/components/app-editor/timeline-view/timeline-view";
import { useAppEditorHotkeys } from "@/app/components/app-editor/app-editor.hotkeys";
import {
  getConfigPaneClassName,
  getEditorColumnClassName,
  getPreviewConfigColumnClassName,
  getPreviewPaneClassName,
  getTimelinePaneClassName,
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

function EditorPreviewRow({
  configOpen,
  defaultLayout,
  editorPanelRef,
  id,
  onLayoutChanged,
}: {
  configOpen: boolean;
  defaultLayout: ReturnType<typeof useAppEditorLayout>["defaultLayout"];
  editorPanelRef: ReturnType<typeof useAppEditorPanels>["editorPanelRef"];
  id: string;
  onLayoutChanged: ReturnType<typeof useAppEditorLayout>["onLayoutChanged"];
}) {
  return (
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
  );
}

export function AppEditor() {
  useAppEditor();
  useAppEditorHotkeys();
  const { defaultLayout, defaultShellLayout, id, onLayoutChanged, onShellLayoutChanged, shellId } =
    useAppEditorLayout();
  const isDesktop = useDesktopEditorLayout();
  const { configOpen, editorPanelRef } = useAppEditorPanels();

  return (
    <PageEditorProviders>
      <div className="h-full min-h-0">
        {isDesktop ? (
          <ResizablePanelGroup
            id={shellId}
            orientation="vertical"
            className="h-full min-h-0 w-full"
            defaultLayout={defaultShellLayout}
            onLayoutChanged={onShellLayoutChanged}
          >
            <ResizablePanel
              id="editor-preview"
              defaultSize="75%"
              minSize="40%"
              className="min-h-0 overflow-hidden"
            >
              <EditorPreviewRow
                configOpen={configOpen}
                defaultLayout={defaultLayout}
                editorPanelRef={editorPanelRef}
                id={id}
                onLayoutChanged={onLayoutChanged}
              />
            </ResizablePanel>
            <ResizableHandle withHandle className="my-2.5" />
            <ResizablePanel
              id="timeline"
              defaultSize="25%"
              minSize="0%"
              className="min-h-0 overflow-hidden"
            >
              <div className={getTimelinePaneClassName(true)}>
                <TimelineView />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto">
            <EditorColumn />
            <PreviewConfigColumn configOpen={configOpen} />
            <div className={getTimelinePaneClassName(false)}>
              <TimelineView />
            </div>
          </div>
        )}
      </div>
    </PageEditorProviders>
  );
}
