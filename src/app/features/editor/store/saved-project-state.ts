import {
  isSavedContentPage,
  type SavedProject,
  type SavedProjectSettings,
  type SavedSequenceItem,
} from "@/_schemas";

export type SavedProjectState = {
  project: SavedProjectSettings;
  sequenceOrder: string[];
  itemsById: Record<string, SavedSequenceItem>;
  itemRevision: Record<string, number>;
  renderRevision: number;
};

export type SaveProjectResult = {
  project: SavedProject;
  updatedItemIds: string[];
};

function toSettings(project: SavedProject): SavedProjectSettings {
  return {
    meta: project.meta,
    bgm: project.bgm,
    voicePresets: project.voicePresets,
  };
}

function toItemsById(project: SavedProject) {
  return Object.fromEntries(project.pages.map((item) => [item.id, item]));
}

export function createSavedProjectState(project: SavedProject): SavedProjectState {
  const itemsById = toItemsById(project);
  return {
    project: toSettings(project),
    sequenceOrder: project.pages.map((item) => item.id),
    itemsById,
    itemRevision: Object.fromEntries(Object.keys(itemsById).map((itemId) => [itemId, 0])),
    renderRevision: 0,
  };
}

export function reconstructSavedProject(state: SavedProjectState): SavedProject {
  return {
    meta: state.project.meta,
    bgm: state.project.bgm,
    voicePresets: state.project.voicePresets,
    pages: state.sequenceOrder.flatMap((itemId) => {
      const item = state.itemsById[itemId];
      return item ? [item] : [];
    }),
  };
}

function getItemTimingSignature(item: SavedSequenceItem | undefined, itemId: string) {
  if (!item) {
    return itemId;
  }
  if (item.type === "transition") {
    return `${itemId}:transition:${item.variant}`;
  }
  return `${itemId}:${item.durationSec}:${item.padBeforeSec}:${item.padAfterSec}`;
}

function affectsAllRenders(previous: SavedProjectState, next: SavedProjectState) {
  if (
    previous.project.meta.width !== next.project.meta.width ||
    previous.project.meta.height !== next.project.meta.height ||
    previous.sequenceOrder.join("\0") !== next.sequenceOrder.join("\0")
  ) {
    return true;
  }

  return previous.sequenceOrder.some((itemId) => {
    return (
      getItemTimingSignature(previous.itemsById[itemId], itemId) !==
      getItemTimingSignature(next.itemsById[itemId], itemId)
    );
  });
}

export function applySavedProjectHydrate(
  _state: SavedProjectState,
  project: SavedProject,
): SavedProjectState {
  return createSavedProjectState(project);
}

export function applySavedProjectSaveResult(
  state: SavedProjectState,
  result: SaveProjectResult,
): SavedProjectState {
  const next = createSavedProjectState(result.project);
  const nextItemRevision = { ...next.itemRevision };

  for (const itemId of Object.keys(nextItemRevision)) {
    const previousRevision = state.itemRevision[itemId] ?? 0;
    nextItemRevision[itemId] = result.updatedItemIds.includes(itemId)
      ? previousRevision + 1
      : previousRevision;
  }

  return {
    ...next,
    itemRevision: nextItemRevision,
    renderRevision: affectsAllRenders(state, next)
      ? state.renderRevision + 1
      : state.renderRevision,
  };
}

export type PageThumbnailBinding = {
  pageId: string;
  itemRevision: number;
  renderRevision: number;
  hasSavedContentPage: boolean;
};

export function selectPageThumbnailBinding(
  state: SavedProjectState,
  pageId: string,
): PageThumbnailBinding {
  const item = state.itemsById[pageId];
  return {
    pageId,
    itemRevision: state.itemRevision[pageId] ?? 0,
    renderRevision: state.renderRevision,
    hasSavedContentPage: Boolean(item && isSavedContentPage(item)),
  };
}

export function selectPageThumbnailBindingKey(state: SavedProjectState, pageId: string) {
  const item = state.itemsById[pageId];
  return [
    pageId,
    state.itemRevision[pageId] ?? 0,
    state.renderRevision,
    item && isSavedContentPage(item) ? 1 : 0,
  ].join(":");
}

export function shouldMountRemotionThumbnail(input: {
  inViewport: boolean;
  hasSavedContentPage: boolean;
}) {
  return input.inViewport && input.hasSavedContentPage;
}
