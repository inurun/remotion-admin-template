import type { PageType } from "./project/primitives";
import type { SavedPage, SavedSequenceItem, SavedTransition } from "./project/page";

export function isTransition<T extends { type: string }>(
  item: T,
): item is Extract<T, { type: "transition" }> {
  return item.type === "transition";
}

export function isContentPage<T extends { type: string }>(
  item: T,
): item is Exclude<T, { type: "transition" }> {
  return item.type !== "transition";
}

export function isSavedTransition(item: SavedSequenceItem): item is SavedTransition {
  return item.type === "transition";
}

export function isSavedContentPage(item: SavedSequenceItem): item is SavedPage {
  return item.type !== "transition";
}

export function pageTypeRequiresTts(type: PageType): boolean {
  return type === "intro" || type === "main";
}
