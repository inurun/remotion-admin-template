import { isSavedContentPage, type SavedSequenceItem, type SavedTts } from "@/_schemas";
import { getEffectiveReadText } from "@/server/features/tts/providers/comparison";
import {
  structuredPhrasesFromKana,
  type StructuredG2pPhrase,
} from "@/server/features/tts/g2p-topology";

export type AutomaticG2pUtterance = {
  id: string;
  text: string;
  readText: string;
  baselineKana?: string;
  baselinePhrases?: StructuredG2pPhrase[];
  target: boolean;
};

export type AutomaticG2pPageContext = {
  id: string;
  title: string;
  utterances: AutomaticG2pUtterance[];
};

export type AutomaticG2pTarget = {
  pageId: string;
  ttsId: string;
  baselineKana: string;
};

function toUtterance(
  item: SavedTts,
  target: AutomaticG2pTarget | undefined,
): AutomaticG2pUtterance {
  const utterance: AutomaticG2pUtterance = {
    id: item.id,
    text: item.text,
    readText: getEffectiveReadText(item),
    target: Boolean(target),
  };
  if (target) {
    utterance.baselineKana = target.baselineKana;
    const baselinePhrases = structuredPhrasesFromKana(target.baselineKana);
    if (baselinePhrases) {
      utterance.baselinePhrases = baselinePhrases;
    }
  }
  return utterance;
}

export function buildAutomaticG2pContext(
  pages: readonly SavedSequenceItem[],
  targets: readonly AutomaticG2pTarget[],
): AutomaticG2pPageContext[] {
  const targetsByTtsId = new Map(targets.map((target) => [target.ttsId, target]));
  const pagesWithTargets = new Set(targets.map((target) => target.pageId));

  return pages.flatMap((page) => {
    if (!isSavedContentPage(page) || !pagesWithTargets.has(page.id)) {
      return [];
    }

    return [
      {
        id: page.id,
        title: page.title,
        utterances: page.tts.map((item) => {
          const target = targetsByTtsId.get(item.id);
          if (target && target.pageId !== page.id) {
            return toUtterance(item, undefined);
          }
          return toUtterance(item, target);
        }),
      },
    ];
  });
}
