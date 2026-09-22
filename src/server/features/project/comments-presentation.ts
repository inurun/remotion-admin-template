import type { CommentsPresentation } from "@/_schemas";

export type CommentPresentationSlot = "left" | "center" | "right";

export type CommentPresentationTriplet<T> = {
  left: T | null;
  center: T;
  right: T | null;
};

export type CommentSceneRef = {
  id: string;
  groupIds: readonly string[];
};

export function createCommentScenesFromGroupIds(
  groupIds: readonly string[],
  presentation: CommentsPresentation,
  createId: (chunk: readonly string[]) => string = () => crypto.randomUUID(),
): Array<{ id: string; groupIds: string[] }> {
  const size = presentation === "single" ? 1 : 3;
  const scenes: Array<{ id: string; groupIds: string[] }> = [];
  for (let index = 0; index < groupIds.length; index += size) {
    const chunk = groupIds.slice(index, index + size);
    if (chunk.length === 0) {
      continue;
    }
    scenes.push({ id: createId(chunk), groupIds: chunk });
  }
  return scenes;
}

export function migratedCommentSceneId(groupIds: readonly string[]) {
  return `scene:${groupIds.join(":")}`;
}

function groupsById<T extends { id: string }>(groups: readonly T[]) {
  return new Map(groups.map((group) => [group.id, group]));
}

function sceneGroups<T extends { id: string }>(
  scene: CommentSceneRef,
  byId: ReadonlyMap<string, T>,
): T[] {
  return scene.groupIds.flatMap((id) => {
    const group = byId.get(id);
    return group ? [group] : [];
  });
}

export function orderedCommentGroups<T extends { id: string }>(
  groups: readonly T[],
  scenes: readonly CommentSceneRef[],
): T[] {
  const byId = groupsById(groups);
  return scenes.flatMap((scene) => sceneGroups(scene, byId));
}

function tripletFromGroups<T>(groups: readonly T[]): CommentPresentationTriplet<T> | null {
  if (groups.length === 0) {
    return null;
  }
  if (groups.length === 1) {
    return { left: null, center: groups[0] as T, right: null };
  }
  if (groups.length === 2) {
    return { left: null, center: groups[0] as T, right: groups[1] as T };
  }
  return {
    left: groups[0] as T,
    center: groups[1] as T,
    right: groups[2] as T,
  };
}

export function listCommentPresentationTriplets<T extends { id: string }>(
  groups: readonly T[],
  scenes: readonly CommentSceneRef[],
  presentation: CommentsPresentation,
): Array<CommentPresentationTriplet<T>> {
  const byId = groupsById(groups);
  if (presentation === "single") {
    return orderedCommentGroups(groups, scenes).map((group) => ({
      left: null,
      center: group,
      right: null,
    }));
  }
  return scenes.flatMap((scene) => {
    const triplet = tripletFromGroups(sceneGroups(scene, byId));
    return triplet ? [triplet] : [];
  });
}

export function commentGroupSlot<T extends { id: string }>(
  groups: readonly T[],
  scenes: readonly CommentSceneRef[],
  presentation: CommentsPresentation,
  groupId: string,
): CommentPresentationSlot | null {
  for (const triplet of listCommentPresentationTriplets(groups, scenes, presentation)) {
    if (triplet.left?.id === groupId) {
      return "left";
    }
    if (triplet.center.id === groupId) {
      return "center";
    }
    if (triplet.right?.id === groupId) {
      return "right";
    }
  }
  return null;
}

export function listCenterCommentGroupIds<T extends { id: string }>(
  groups: readonly T[],
  scenes: readonly CommentSceneRef[],
  presentation: CommentsPresentation,
): string[] {
  return listCommentPresentationTriplets(groups, scenes, presentation).map(
    (triplet) => triplet.center.id,
  );
}

export function listPlaybackCommentGroups<T extends { id: string; ttsIds: readonly string[] }>(
  groups: readonly T[],
  scenes: readonly CommentSceneRef[],
  presentation: CommentsPresentation,
  availableTtsIds?: ReadonlySet<string>,
): T[] {
  return listCommentPresentationTriplets(groups, scenes, presentation)
    .filter((triplet) =>
      triplet.center.ttsIds.some((id) => (availableTtsIds ? availableTtsIds.has(id) : true)),
    )
    .map((triplet) => triplet.center);
}

export function listCommentGroupPlaybackTts<T extends { id: string }>(
  groups: readonly { id: string; ttsIds: readonly string[] }[],
  scenes: readonly CommentSceneRef[],
  tts: readonly T[],
  presentation: CommentsPresentation,
): T[] {
  const ttsById = new Map(tts.map((item) => [item.id, item]));
  const availableTtsIds = new Set(ttsById.keys());
  return listPlaybackCommentGroups(groups, scenes, presentation, availableTtsIds).flatMap((group) =>
    group.ttsIds.flatMap((id) => {
      const item = ttsById.get(id);
      return item ? [item] : [];
    }),
  );
}

export function findCommentPresentationTriplet<T extends { id: string }>(
  groups: readonly T[],
  scenes: readonly CommentSceneRef[],
  presentation: CommentsPresentation,
  centerId: string,
): CommentPresentationTriplet<T> | null {
  return (
    listCommentPresentationTriplets(groups, scenes, presentation).find(
      (triplet) => triplet.center.id === centerId,
    ) ?? null
  );
}

export function spokenCommentGroupId(scene: CommentSceneRef) {
  return scene.groupIds.length >= 3 ? scene.groupIds[1] : scene.groupIds[0];
}
