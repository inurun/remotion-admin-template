import type {
  DraftPage,
  DraftSequenceItem,
  DraftTransition,
  SavedPage,
  SavedSequenceItem,
  SavedTransition,
} from "./project";

export function isTransition(
  item: DraftSequenceItem | SavedSequenceItem,
): item is DraftTransition | SavedTransition {
  return item.type === "transition";
}

export function isContentPage(
  item: DraftSequenceItem | SavedSequenceItem,
): item is DraftPage | SavedPage {
  return item.type !== "transition";
}

export function isSavedTransition(item: SavedSequenceItem): item is SavedTransition {
  return item.type === "transition";
}

export function isSavedContentPage(item: SavedSequenceItem): item is SavedPage {
  return item.type !== "transition";
}

export function isDraftTransition(item: DraftSequenceItem): item is DraftTransition {
  return item.type === "transition";
}

export function isDraftContentPage(item: DraftSequenceItem): item is DraftPage {
  return item.type !== "transition";
}
