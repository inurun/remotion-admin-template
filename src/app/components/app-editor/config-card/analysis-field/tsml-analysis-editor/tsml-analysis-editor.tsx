import { StatusMessage } from "@/app/components/app-editor/config-card/analysis-field/status-message/status-message";
import { TsmlPhraseView } from "@/app/components/app-editor/config-card/analysis-field/tsml-phrase-view/tsml-phrase-view";
import { useTsmlAnalysisEditor } from "@/app/components/app-editor/config-card/analysis-field/tsml-analysis-editor/use-tsml-analysis-editor";

export function TsmlAnalysisEditor({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value?: string;
}) {
  const { parsed, getPhraseViews } = useTsmlAnalysisEditor(value);

  return (
    <>
      <StatusMessage parsed={parsed} />
      {parsed.status === "ready" ? (
        <div className="grid gap-3">
          {getPhraseViews(onChange).map((phrase) => (
            <TsmlPhraseView key={phrase.key} phrase={phrase} />
          ))}
        </div>
      ) : null}
    </>
  );
}
