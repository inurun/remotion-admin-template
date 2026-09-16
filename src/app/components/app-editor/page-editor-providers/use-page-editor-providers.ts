import { useEditorSession } from "@/app/features/editor/store/editor-session-store-context";
import { useSelectedPageId } from "@/app/features/project/context/project-route-context";

export function usePageEditorProviders() {
  const pageId = useSelectedPageId();
  const isContentPage = useEditorSession((state) => {
    if (!pageId) {
      return false;
    }
    const item = state.itemsById[pageId];
    return Boolean(item && item.type !== "transition");
  });
  return {
    pageId,
    isContentPage,
  };
}
