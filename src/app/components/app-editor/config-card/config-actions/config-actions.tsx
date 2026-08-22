import { Sparkles, FlaskConical, Volume2 } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { useConfigTtsActions } from "@/app/components/app-editor/config-card/config-actions/use-config-actions";
import { TtsSettingsDialog } from "@/app/components/app-editor/config-card/tts-settings-dialog/tts-settings-dialog";

function AnalyzeButton({
  disabled,
  isAnalyzing,
  onClick,
}: {
  disabled: boolean;
  isAnalyzing: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      disabled={disabled}
      onClick={onClick}
      title={isAnalyzing ? "Analyzing" : "Analyze"}
      aria-label={isAnalyzing ? "Analyzing" : "Analyze"}
    >
      <Sparkles className={isAnalyzing ? "animate-pulse" : undefined} />
    </Button>
  );
}

function LlmAnalyzeButton({
  disabled,
  pending,
  onClick,
}: {
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      disabled={disabled}
      onClick={onClick}
      title={pending ? "LLM G2P running" : "LLM G2P"}
      aria-label="LLM G2P"
    >
      <FlaskConical className={pending ? "animate-pulse" : undefined} />
    </Button>
  );
}

function PreviewButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      title="Preview"
      aria-label="Preview"
    >
      <Volume2 />
    </Button>
  );
}

export function ConfigActions() {
  const {
    analyzeDisabled,
    analyzeSelected,
    isAnalyzing,
    llmAnalyzeDisabled,
    llmAnalyzeSelected,
    isLlmAnalyzing,
    previewDisabled,
    previewSelected,
  } = useConfigTtsActions();

  return (
    <div className="flex flex-wrap gap-2">
      <AnalyzeButton
        disabled={analyzeDisabled}
        isAnalyzing={isAnalyzing}
        onClick={analyzeSelected}
      />
      <LlmAnalyzeButton
        disabled={llmAnalyzeDisabled}
        pending={isLlmAnalyzing}
        onClick={llmAnalyzeSelected}
      />
      <PreviewButton disabled={previewDisabled} onClick={previewSelected} />
      <TtsSettingsDialog />
    </div>
  );
}
