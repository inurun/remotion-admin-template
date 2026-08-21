import type { G2pBoundary } from "@/_schemas";
import type { G2pPhraseView } from "@/app/components/app-editor/config-card/analysis-field/g2p-analysis-editor/use-g2p-analysis-editor";
import { WordCard } from "@/app/components/app-editor/config-card/analysis-field/word-card/word-card";

const BOUNDARY_LABEL: Record<G2pBoundary, string | undefined> = {
  none: undefined,
  pause: "pause",
  question: "question",
  exclamation: "exclamation",
};

export function G2pSegmentView({
  boundary,
  phrases,
}: {
  boundary: G2pBoundary;
  phrases: G2pPhraseView[];
}) {
  const boundaryLabel = BOUNDARY_LABEL[boundary];

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-3">
        {phrases.map(({ key, ...phrase }) => (
          <WordCard key={key} {...phrase} />
        ))}
      </div>
      {boundaryLabel ? <div className="text-xs text-muted-foreground">{boundaryLabel}</div> : null}
    </div>
  );
}
