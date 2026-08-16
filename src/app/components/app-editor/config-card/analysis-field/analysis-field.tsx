import { G2pAnalysisEditor } from "@/app/components/app-editor/config-card/analysis-field/g2p-analysis-editor/g2p-analysis-editor";
import { useAnalysisField } from "@/app/components/app-editor/config-card/analysis-field/use-analysis-field";

export function AnalysisField() {
  const { provider, value, onChange } = useAnalysisField();

  if (provider === "voicepeak") {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        VoicePeak has no analysis
      </div>
    );
  }

  return <G2pAnalysisEditor value={value} onChange={onChange} />;
}
