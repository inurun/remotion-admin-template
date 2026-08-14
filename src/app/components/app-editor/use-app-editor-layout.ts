import { useDefaultLayout } from "react-resizable-panels";

const APP_EDITOR_LAYOUT_ID = "app-editor-layout";

export function useAppEditorLayout() {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: APP_EDITOR_LAYOUT_ID,
  });

  return {
    defaultLayout,
    id: APP_EDITOR_LAYOUT_ID,
    onLayoutChanged,
  };
}
