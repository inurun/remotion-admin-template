import { Input } from "@/_shared/components/ui/input";
import { StatusMessage } from "@/app/components/app-editor/config-card/analysis-field/status-message/status-message";
import { G2pPhraseView } from "@/app/components/app-editor/config-card/analysis-field/g2p-analysis-editor/g2p-phrase-view/g2p-phrase-view";
import { G2pTextHighlight } from "@/app/components/app-editor/config-card/analysis-field/g2p-analysis-editor/g2p-text-highlight/g2p-text-highlight";
import { useG2pAnalysisEditor } from "@/app/components/app-editor/config-card/analysis-field/g2p-analysis-editor/use-g2p-analysis-editor";
import type { G2pItem } from "@/_schemas";

export function G2pAnalysisEditor({
  onChange,
  value,
}: {
  onChange: (value: G2pItem) => void;
  value?: G2pItem;
}) {
  const editor = useG2pAnalysisEditor(value, onChange);

  if (editor.parsed.status !== "ready") {
    return <StatusMessage parsed={editor.parsed} />;
  }

  return (
    <div className="grid gap-3">
      <G2pTextHighlight text={editor.parsed.item.text} spans={editor.unknownSpans} />
      <Input
        className="font-mono"
        value={editor.draft}
        disabled={editor.pending}
        onChange={(event) => editor.setDraft(event.target.value)}
        onBlur={() => void editor.commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void editor.commit();
          }
        }}
      />
      {editor.warningsWithoutSpan.length > 0 ? (
        <ul className="grid gap-1 text-xs text-muted-foreground">
          {editor.warningsWithoutSpan.map((warning, index) => (
            <li key={`${warning.code}-${index}`}>{warning.code}</li>
          ))}
        </ul>
      ) : null}
      {editor.getPhraseViews().map((phrase) => (
        <G2pPhraseView
          key={phrase.key}
          words={phrase.words}
          moras={phrase.moras}
          accent={phrase.accent}
          boundary={phrase.boundary}
          disabled={editor.pending}
          onAccentChange={phrase.onAccentChange}
        />
      ))}
      {editor.error ? <p className="text-sm text-destructive">{editor.error}</p> : null}
    </div>
  );
}
