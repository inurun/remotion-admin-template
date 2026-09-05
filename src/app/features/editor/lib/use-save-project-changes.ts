import { cancelScheduledAutoSave } from "@/app/features/editor/lib/auto-save";
import { useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/_shared/lib/error-message";
import { saveProjectChanges } from "@/app/features/project/api/project-api";
import { useProjectRoute } from "@/app/features/project/context/project-route-context";
import { useEditorSessionStoreApi } from "@/app/features/editor/store/editor-session-store-context";
import { useSavedProjectStoreApi } from "@/app/features/editor/store/saved-project-store-context";
import {
  buildSaveChangeSet,
  captureDirtySnapshot,
} from "@/app/features/editor/store/editor-session-state";
import { useSaveStatusStore } from "@/app/features/editor/store/save-status-store";
import { useProjectsQuery } from "@/app/features/project/swr/use-project-queries";
import { createSerializedRunner } from "@/app/features/editor/lib/serialized-runner";
import {
  isEmptyChangeSet,
  validateChangeSet,
} from "@/app/features/editor/lib/validate-save-change-set";

const enqueueSave = createSerializedRunner();

export function useSaveProjectChanges() {
  const editorStore = useEditorSessionStoreApi();
  const savedStore = useSavedProjectStoreApi();
  const { projectPath } = useProjectRoute();
  const { reloadProjects } = useProjectsQuery();
  const isPending = useSaveStatusStore((state) => state.isPending);
  const setPending = useSaveStatusStore((state) => state.setPending);

  const save = useCallback(
    async (options?: { forceResynthesis?: boolean; automatic?: boolean }) => {
      if (!projectPath) {
        throw new Error("Project path is required");
      }

      cancelScheduledAutoSave(editorStore);
      const savePromise = enqueueSave(async () => {
        const session = editorStore.getState();
        const changeSet = buildSaveChangeSet(session, options);
        if (isEmptyChangeSet(changeSet)) {
          return;
        }

        validateChangeSet(changeSet);
        const dirtySnapshot = captureDirtySnapshot(session);
        setPending(true);
        try {
          const result = await saveProjectChanges(projectPath, changeSet);
          savedStore.getState().applySaveResult(result);
          editorStore.getState().applySaveSuccess(result, dirtySnapshot);
          await reloadProjects();
        } finally {
          setPending(false);
        }
      });

      if (options?.automatic) {
        try {
          await savePromise;
        } catch (error) {
          toast.error(getErrorMessage(error, "Save failed"));
          throw error;
        }
      } else {
        toast.promise(savePromise, {
          loading: "保存中...",
          success: "保存して音声を更新した。",
          error: (error) => getErrorMessage(error, "Save failed"),
        });
        await savePromise;
      }
    },
    [editorStore, projectPath, reloadProjects, savedStore, setPending],
  );

  return {
    isPending,
    save,
  };
}
