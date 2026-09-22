import { type DictionaryWord, type SavedSequenceItem, type SavedTts } from "@/_schemas";
import { listSavedPageTtsInPlaybackOrder } from "@/server/features/project/comments-playback";
import { getEffectiveReadText } from "@/server/features/tts/providers/comparison";

export type AutomaticG2pUtterance = {
  id: string;
  text: string;
  readText: string;
  baselineKana?: string;
  dictionaryWords?: DictionaryWord[];
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
  dictionaryWords?: DictionaryWord[];
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
    if (target.dictionaryWords) {
      utterance.dictionaryWords = target.dictionaryWords;
    }
  }
  return utterance;
}

export function contextForChunk(
  pages: readonly AutomaticG2pPageContext[],
  targetIds: ReadonlySet<string>,
): AutomaticG2pPageContext[] {
  return pages.flatMap((page) => {
    if (!page.utterances.some((utterance) => targetIds.has(utterance.id))) {
      return [];
    }

    return [
      {
        id: page.id,
        title: page.title,
        utterances: page.utterances.map((utterance) => {
          if (targetIds.has(utterance.id)) {
            return { ...utterance, target: true };
          }
          return {
            id: utterance.id,
            text: utterance.text,
            readText: utterance.readText,
            target: false,
          };
        }),
      },
    ];
  });
}

export function buildAutomaticG2pContext(
  pages: readonly SavedSequenceItem[],
  targets: readonly AutomaticG2pTarget[],
): AutomaticG2pPageContext[] {
  const targetsByTtsId = new Map(targets.map((target) => [target.ttsId, target]));
  const pagesWithTargets = new Set(targets.map((target) => target.pageId));

  return pages.flatMap((page) => {
    if (page.type === "transition" || !pagesWithTargets.has(page.id)) {
      return [];
    }

    if (page.type === "comments") {
      return page.commentGroups.flatMap((group) => {
        const utterances = listSavedPageTtsInPlaybackOrder({
          ...page,
          commentGroups: [group],
          commentScenes: [{ id: group.id, groupIds: [group.id] }],
        }).map((item) => {
          const target = targetsByTtsId.get(item.id);
          if (target && target.pageId !== page.id) {
            return toUtterance(item, undefined);
          }
          return toUtterance(item, target);
        });
        if (!utterances.some((utterance) => utterance.target || targetsByTtsId.has(utterance.id))) {
          return [];
        }
        return [
          {
            id: page.id,
            title: page.title,
            utterances,
          },
        ];
      });
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
