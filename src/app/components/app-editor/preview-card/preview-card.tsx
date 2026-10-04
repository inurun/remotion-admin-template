import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/app/components/ui/collapsible";
import { PreviewBody } from "@/app/components/app-editor/preview-card/preview-body/preview-body";
import { PreviewLoading } from "@/app/components/app-editor/preview-card/preview-loading/preview-loading";
import { PanelCollapseTrigger } from "@/app/components/app-editor/panel-collapse-trigger/panel-collapse-trigger";
import { usePanelOpen } from "@/app/components/app-editor/use-panel-open";
import { usePreviewCard } from "@/app/components/app-editor/preview-card/use-preview-card";

export function PreviewCard() {
  const { durationInFrames, previewProject, projectPath, timeline, schedules } = usePreviewCard();
  const { open, onOpenChange } = usePanelOpen("preview");

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl">Preview</CardTitle>
            <PanelCollapseTrigger />
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {projectPath ? (
              <PreviewBody
                durationInFrames={durationInFrames}
                project={previewProject}
                projectPath={projectPath}
                timeline={timeline}
                schedules={schedules}
              />
            ) : (
              <PreviewLoading />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
