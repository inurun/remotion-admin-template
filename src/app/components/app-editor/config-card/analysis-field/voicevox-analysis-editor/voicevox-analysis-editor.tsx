import { StatusMessage } from "@/app/components/app-editor/config-card/analysis-field/status-message/status-message";
import { useVoicevoxAnalysisEditor } from "@/app/components/app-editor/config-card/analysis-field/voicevox-analysis-editor/use-voicevox-analysis-editor";
import { VoicevoxReadyEditor } from "@/app/components/app-editor/config-card/analysis-field/voicevox-ready-editor/voicevox-ready-editor";

export function VoicevoxAnalysisEditor({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value?: string;
}) {
  const { parsed, updateQuery } = useVoicevoxAnalysisEditor(value, onChange);

  if (parsed.status !== "ready") {
    return (
      <StatusMessage
        parsed={
          parsed.status === "error"
            ? { status: "error", message: parsed.message }
            : { status: parsed.status }
        }
      />
    );
  }

  return <VoicevoxReadyEditor query={parsed.query} onUpdateQuery={updateQuery} />;
}
