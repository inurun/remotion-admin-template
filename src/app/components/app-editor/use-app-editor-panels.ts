import { useEffect } from "react";
import { usePanelRef } from "react-resizable-panels";
import { usePanelOpen } from "@/app/components/app-editor/use-panel-open";

export function useAppEditorPanels() {
  const { open: editorOpen } = usePanelOpen("editor");
  const { open: configOpen } = usePanelOpen("config");
  const editorPanelRef = usePanelRef();

  useEffect(() => {
    const panel = editorPanelRef.current;
    if (!panel) {
      return;
    }
    if (editorOpen) {
      if (panel.isCollapsed()) {
        panel.expand();
      }
      return;
    }
    if (!panel.isCollapsed()) {
      panel.collapse();
    }
  }, [editorOpen, editorPanelRef]);

  return {
    editorOpen,
    configOpen,
    editorPanelRef,
  };
}
