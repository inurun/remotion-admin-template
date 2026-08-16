import { StatusMessage } from "@/app/components/app-editor/config-card/analysis-field/status-message/status-message";
import { G2pSegmentView } from "@/app/components/app-editor/config-card/analysis-field/g2p-analysis-editor/g2p-segment-view/g2p-segment-view";
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
  const { parsed, unknownSpans, warningsWithoutSpan, getSegmentViews } = useG2pAnalysisEditor(
    value,
    onChange,
  );

  if (parsed.status !== "ready") {
    return <StatusMessage parsed={parsed} />;
  }

  return (
    <div className="grid gap-3">
      <G2pTextHighlight text={parsed.item.text} spans={unknownSpans} />
      {warningsWithoutSpan.length > 0 ? (
        <ul className="grid gap-1 text-xs text-muted-foreground">
          {warningsWithoutSpan.map((warning, index) => (
            <li key={`${warning.code}-${index}`}>{warning.code}</li>
          ))}
        </ul>
      ) : null}
      {getSegmentViews().map((segment) => (
        <G2pSegmentView key={segment.key} boundary={segment.boundary} words={segment.words} />
      ))}
    </div>
  );
}
