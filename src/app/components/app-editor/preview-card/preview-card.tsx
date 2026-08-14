import { Card, CardContent, CardHeader, CardTitle } from "@/_shared/components/ui/card";
import { PreviewBody } from "@/app/components/app-editor/preview-card/preview-body/preview-body";
import { PreviewLoading } from "@/app/components/app-editor/preview-card/preview-loading/preview-loading";
import { usePreviewCard } from "@/app/components/app-editor/preview-card/use-preview-card";

export function PreviewCard() {
  const { component, durationInFrames, previewProject } = usePreviewCard();

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xl">Preview</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {component ? (
          <PreviewBody
            component={component}
            durationInFrames={durationInFrames}
            project={previewProject}
          />
        ) : (
          <PreviewLoading />
        )}
      </CardContent>
    </Card>
  );
}
