import { Thumbnail } from "@remotion/player";
import { VIDEO_FPS } from "@/constants";
import {
  type PageThumbnailProps,
  usePageThumbnail,
} from "@/app/components/app-editor/editor-card/page-list/page-list-item/page-thumbnail/use-page-thumbnail";

export function PageThumbnail(props: PageThumbnailProps) {
  const { containerRef, dirty, remotionInput, showPlaceholder } = usePageThumbnail(props);

  return (
    <div ref={containerRef} className="relative size-full">
      {showPlaceholder || !remotionInput ? (
        <div className="flex h-full items-center justify-center bg-muted/40 px-3 text-xs text-muted-foreground">
          Unsaved
        </div>
      ) : (
        <div className="remotion-surface size-full">
          <Thumbnail
            component={remotionInput.component}
            inputProps={{ project: remotionInput.project }}
            durationInFrames={remotionInput.durationInFrames}
            fps={VIDEO_FPS}
            compositionWidth={remotionInput.project.meta.width}
            compositionHeight={remotionInput.project.meta.height}
            frameToDisplay={remotionInput.frameToDisplay}
            style={{ width: "100%" }}
          />
        </div>
      )}
      {dirty ? (
        <span className="absolute right-1 top-1 rounded bg-background/90 px-1 py-0.5 text-[10px] font-medium">
          Dirty
        </span>
      ) : null}
    </div>
  );
}
