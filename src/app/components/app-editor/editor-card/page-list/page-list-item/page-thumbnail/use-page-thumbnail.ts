import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type { SavedProject, SavedTimeline } from "@/_schemas";
import { VIDEO_FPS } from "@/constants";
import {
  reconstructSavedProject,
  shouldMountRemotionThumbnail,
} from "@/app/features/editor/store/saved-project-state";
import {
  useSavedProject,
  useSavedProjectStoreApi,
} from "@/app/features/editor/store/saved-project-store-context";
import {
  getPageThumbnailFrame,
  getProjectPageTimings,
} from "@/app/components/app-editor/editor-card/page-list/page-list.lib";

export type PageThumbnailProps = {
  component: ComponentType<{ project: SavedProject; timeline: SavedTimeline }>;
  pageId: string;
  dirty: boolean;
};

export function usePageThumbnail({ component, pageId, dirty }: PageThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inViewport, setInViewport] = useState(false);
  const itemRevision = useSavedProject((state) => state.itemRevision[pageId] ?? 0);
  const renderRevision = useSavedProject((state) => state.renderRevision);
  const hasSavedContentPage = useSavedProject((state) => {
    const item = state.itemsById[pageId];
    return Boolean(item && item.type !== "transition");
  });
  const savedStore = useSavedProjectStoreApi();

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInViewport(Boolean(entry?.isIntersecting));
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const mountRemotion = shouldMountRemotionThumbnail({
    inViewport,
    hasSavedContentPage,
  });

  const remotionInput = useMemo(() => {
    if (!mountRemotion) {
      return null;
    }
    const state = savedStore.getState();
    const project = reconstructSavedProject(state);
    const durationInFrames = Math.max(1, Math.ceil(state.timeline.durationSec * VIDEO_FPS));
    const timing = getProjectPageTimings(state.timeline).find((page) => page.id === pageId);
    if (!timing) {
      return null;
    }
    return {
      component,
      project,
      timeline: state.timeline,
      durationInFrames,
      frameToDisplay: getPageThumbnailFrame(timing, VIDEO_FPS, durationInFrames),
    };
  }, [component, itemRevision, mountRemotion, pageId, renderRevision, savedStore]);

  return {
    containerRef,
    dirty,
    remotionInput,
    showPlaceholder: !hasSavedContentPage,
  };
}
