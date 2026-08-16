import type { G2pBoundary } from "@/_schemas";
import type { G2pWordView } from "@/app/components/app-editor/config-card/analysis-field/g2p-analysis-editor/use-g2p-analysis-editor";
import { WordCard } from "@/app/components/app-editor/config-card/analysis-field/word-card/word-card";

const BOUNDARY_LABEL: Record<G2pBoundary, string | undefined> = {
  none: undefined,
  pause: "pause",
  question: "question",
  exclamation: "exclamation",
};

export function G2pSegmentView({
  boundary,
  words,
}: {
  boundary: G2pBoundary;
  words: G2pWordView[];
}) {
  const boundaryLabel = BOUNDARY_LABEL[boundary];

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-3">
        {words.map((word) =>
          word.ignored ? (
            <span key={word.key} className="px-1 text-sm text-muted-foreground/60">
              {word.surface || " "}
            </span>
          ) : (
            <WordCard
              key={word.key}
              isChained={word.isChained}
              moraButtons={word.moraButtons}
              onToggleChain={word.onToggleChain}
            />
          ),
        )}
      </div>
      {boundaryLabel ? <div className="text-xs text-muted-foreground">{boundaryLabel}</div> : null}
    </div>
  );
}
