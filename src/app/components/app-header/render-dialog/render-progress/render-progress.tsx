import { Progress, ProgressValue } from "@/_shared/components/ui/progress";
import { useRenderProgress } from "@/app/components/app-header/render-dialog/render-progress/use-render-progress";

export function RenderProgress({ progress }: { progress: number }) {
  const panel = useRenderProgress(progress);

  return (
    <Progress value={panel.value}>
      <ProgressValue />
    </Progress>
  );
}
