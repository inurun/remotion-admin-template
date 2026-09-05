import { useEffect, useRef } from "react";
import { useEditorSessionStoreApi } from "@/app/features/editor/store/editor-session-store-context";
import { useProjectRoute } from "@/app/features/project/context/project-route-context";
import { useSaveProjectChanges } from "@/app/features/editor/lib/use-save-project-changes";
import { watchAutoSave } from "@/app/features/editor/lib/auto-save";

export function useAutoSaveProject() {
  const store = useEditorSessionStoreApi();
  const { projectPath } = useProjectRoute();
  const { save } = useSaveProjectChanges();
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!projectPath) return;
    return watchAutoSave(store, () => saveRef.current({ automatic: true }));
  }, [store, projectPath]);
}
