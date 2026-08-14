import { Thumbnail } from "@remotion/player";
import { VIDEO_FPS } from "@/constants";
import {
  type PageThumbnailProps,
  usePageThumbnail,
} from "@/app/components/app-editor/editor-card/page-list/page-list-item/page-thumbnail/use-page-thumbnail";

export function PageThumbnail(props: PageThumbnailProps) {
  const { showPlaceholder } = usePageThumbnail(props);

  if (showPlaceholder) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/40 px-3 text-xs text-muted-foreground">
        Unsaved
      </div>
    );
  }

  return (
    <div className="remotion-surface size-full">
      <Thumbnail
        component={props.component}
        inputProps={{ project: props.project }}
        durationInFrames={props.durationInFrames}
        fps={VIDEO_FPS}
        compositionWidth={props.project.meta.width}
        compositionHeight={props.project.meta.height}
        frameToDisplay={props.frameToDisplay!}
        style={{ width: "100%" }}
      />
    </div>
  );
}
