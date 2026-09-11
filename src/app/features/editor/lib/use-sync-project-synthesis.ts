import { useEffect } from "react";
import { toast } from "sonner";
import { fetchProject } from "@/app/features/project/api/project-api";
import { useProjectRoute } from "@/app/features/project/context/project-route-context";
import { selectHasPendingTts } from "@/app/features/editor/store/saved-project-state";
import {
  useSavedProject,
  useSavedProjectStoreApi,
} from "@/app/features/editor/store/saved-project-store-context";
import { resolveSynthesisPollUpdate } from "@/app/features/editor/lib/project-synthesis-state";

const SYNTHESIS_POLL_INTERVAL_MS = 2000;

export function useSyncProjectSynthesis() {
  const savedStore = useSavedProjectStoreApi();
  const { projectPath } = useProjectRoute();
  const hasPending = useSavedProject(selectHasPendingTts);

  useEffect(() => {
    if (!projectPath || !hasPending) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      const startedSyncGeneration = savedStore.getState().syncGeneration;
      try {
        const project = await fetchProject(projectPath);
        if (cancelled) {
          return;
        }
        const current = savedStore.getState();
        const update = resolveSynthesisPollUpdate({
          startedSyncGeneration,
          current,
          project,
        });
        if (!update.apply) {
          return;
        }
        savedStore.getState().applyExternalProject(project);
        for (const item of update.failedToasts) {
          toast.error(item.message);
        }
      } catch {
        // keep polling while pending remains
      } finally {
        if (!cancelled && selectHasPendingTts(savedStore.getState())) {
          timer = setTimeout(() => {
            void poll();
          }, SYNTHESIS_POLL_INTERVAL_MS);
        }
      }
    };

    timer = setTimeout(() => {
      void poll();
    }, SYNTHESIS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasPending, projectPath, savedStore]);
}
