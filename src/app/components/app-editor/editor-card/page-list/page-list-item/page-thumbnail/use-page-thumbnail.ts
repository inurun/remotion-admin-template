import type { ComponentType } from "react";
import type { SavedProject } from "@/_schemas";

export type PageThumbnailProps = {
  component: ComponentType<{ project: SavedProject }>;
  durationInFrames: number;
  frameToDisplay: number | null;
  project: SavedProject;
};

export function usePageThumbnail({ frameToDisplay }: Pick<PageThumbnailProps, "frameToDisplay">) {
  return {
    showPlaceholder: frameToDisplay === null,
  };
}
