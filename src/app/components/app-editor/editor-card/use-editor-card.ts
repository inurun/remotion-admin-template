import { usePageFormScope } from "@/app/features/page/context/page-form-context";
import { useEditorSession } from "@/app/features/editor/store/editor-session-store-context";
import { useSelectedPageId } from "@/app/features/project/context/project-route-context";

export function useEditorCard() {
  const selectedPageId = useSelectedPageId();
  const { isReady: isPageFormReady } = usePageFormScope();
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

  return {
    selectedPageId,
    selectedPageType,
    selectedTransitionVariant,
    showPageForm: isPageFormReady && Boolean(selectedPageId && selectedPageType),
  };
}
