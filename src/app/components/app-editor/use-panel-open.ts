import {
  useUiPreferencesStore,
  type EditorPanelId,
} from "@/app/features/ui/storage/use-ui-preferences-store";

export function usePanelOpen(panel: EditorPanelId) {
  const open = useUiPreferencesStore((state) => state[`${panel}Open`]);
  const setPanelOpen = useUiPreferencesStore((state) => state.setPanelOpen);

  return {
    open,
    onOpenChange: (nextOpen: boolean) => {
      setPanelOpen(panel, nextOpen);
    },
  };
}
