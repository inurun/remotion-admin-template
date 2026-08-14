import { TsmlAnalysisEditor } from "@/app/components/app-editor/config-card/analysis-field/tsml-analysis-editor/tsml-analysis-editor";
import { useAnalysisField } from "@/app/components/app-editor/config-card/analysis-field/use-analysis-field";
import { VoicevoxAnalysisEditor } from "@/app/components/app-editor/config-card/analysis-field/voicevox-analysis-editor/voicevox-analysis-editor";

export function AnalysisField() {
  const { provider, value, onChange } = useAnalysisField();

  if (provider === "voicepeak") {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        VoicePeak has no analysis
      </div>
    );
  }

  return provider === "voicevox" ? (
    <VoicevoxAnalysisEditor value={value} onChange={onChange} />
  ) : (
    <TsmlAnalysisEditor value={value} onChange={onChange} />
  );
}
