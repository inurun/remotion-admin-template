import { PocketKnife } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { PageSettingsDialog } from "@/app/components/app-editor/editor-card/page-header/page-settings-dialog/page-settings-dialog";
import { ZenDialog } from "@/app/components/app-editor/editor-card/page-header/zen-dialog/zen-dialog";
import { useCommentZen } from "@/app/components/app-editor/editor-card/page-header/comments-zen-dialog/comments-zen-context";
import { useEditorSession } from "@/app/features/editor/store/editor-session-store-context";
import { useSelectedPageId } from "@/app/features/project/context/project-route-context";

export function PageHeader() {
  const selectedPageId = useSelectedPageId();
  const selectedPageType = useEditorSession((state) =>
    selectedPageId ? state.itemsById[selectedPageId]?.type : undefined,
  );
  const isTransition = selectedPageType === "transition";
  const supportsZen = selectedPageType === "main" || selectedPageType === "intro";
  const supportsCommentsZen = selectedPageType === "comments";
  const commentsZen = useCommentZen();

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 text-sm text-muted-foreground">
        <p className="text-[0.5rem] text-muted-foreground font-mono">ID: {selectedPageId}</p>
      </div>
      {isTransition ? null : (
        <div className="flex items-center gap-1">
          {supportsZen ? <ZenDialog key={selectedPageId} /> : null}
          {supportsCommentsZen ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => commentsZen.openZen()}
            >
              <PocketKnife className="size-4 rotate-90 -scale-x-100" />
            </Button>
          ) : null}
          <PageSettingsDialog />
        </div>
      )}
    </div>
  );
}
