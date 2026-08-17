import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { pageFormSchema } from "@/app/features/page/model/page-form-schema";
import type { EditorSessionState } from "@/app/features/editor/store/editor-session-state";
import { mergeSavedSpeechIntoPageForm } from "@/app/features/editor/lib/project-form-conversion";
import { createBlankPageInput } from "@/app/features/page/lib/page-draft";

export const IDLE_PAGE_FORM_ID = "__idle__";

export function createIdlePageFormValues(): PageFormValues {
  return createBlankPageInput({
    id: IDLE_PAGE_FORM_ID,
    title: "",
    type: "main",
  });
}

export function isPageFormScopeReady(requestedPageId: string | null, readyPageId: string | null) {
  return requestedPageId === readyPageId;
}

export function shouldSyncPageFormWatch(
  requestedPageId: string | null,
  readyPageId: string | null,
): requestedPageId is string {
  return requestedPageId !== null && isPageFormScopeReady(requestedPageId, readyPageId);
}

export function readPageFormSnapshot(getValues: () => PageFormValues): PageFormValues {
  return getValues();
}

export function selectPageFormDefaultValues(
  state: Pick<EditorSessionState, "itemsById">,
  pageId: string,
): PageFormValues | null {
  const item = state.itemsById[pageId];
  if (!item || item.type === "transition") {
    return null;
  }
  return item;
}

export function resolvePageFormSwitchValues(
  state: Pick<EditorSessionState, "itemsById">,
  pageId: string | null,
  idlePage: PageFormValues,
): PageFormValues {
  if (!pageId) {
    return idlePage;
  }
  return selectPageFormDefaultValues(state, pageId) ?? idlePage;
}

export function isPageFormSnapshotForPage(page: PageFormValues, pageId: string) {
  return page.id === pageId;
}

export function validatePageFormSnapshot(page: PageFormValues) {
  return pageFormSchema.parse(page);
}

type PageFormSpeechTarget = {
  getValues: () => PageFormValues;
  setValue: (
    name: "tts",
    value: PageFormValues["tts"],
    options?: { shouldDirty?: boolean; shouldTouch?: boolean; shouldValidate?: boolean },
  ) => void;
};

export function applyPageFormSwitch(
  form: { reset: (values: PageFormValues) => void },
  nextPage: PageFormValues,
): PageFormValues {
  form.reset(nextPage);
  return nextPage;
}

export function applyPageFormSavedSpeech(
  form: PageFormSpeechTarget,
  savedPage: PageFormValues,
): PageFormValues | null {
  const current = readPageFormSnapshot(() => form.getValues());
  const next = mergeSavedSpeechIntoPageForm(current, savedPage);
  if (next === current) {
    return null;
  }
  form.setValue("tts", next.tts, {
    shouldDirty: false,
    shouldTouch: false,
    shouldValidate: false,
  });
  return next;
}

function pageFormSnapshotKey(page: PageFormValues) {
  return JSON.stringify(page);
}

function isReconcileSnapshotEcho(
  ignored: PageFormValues,
  ignoredKey: string,
  incoming: PageFormValues,
) {
  return (
    incoming === ignored ||
    incoming.tts === ignored.tts ||
    pageFormSnapshotKey(incoming) === ignoredKey
  );
}

export function createPageFormWatchSync(
  upsertPage: (pageId: string, page: PageFormValues) => void,
) {
  let paused = 0;
  let ignoredSnapshot: PageFormValues | null = null;
  let ignoredKey: string | null = null;

  return {
    sync(pageId: string, getValues: () => PageFormValues) {
      if (paused > 0) {
        return;
      }
      const snapshot = readPageFormSnapshot(getValues);
      if (!isPageFormSnapshotForPage(snapshot, pageId)) {
        return;
      }
      if (
        ignoredSnapshot &&
        ignoredKey &&
        isReconcileSnapshotEcho(ignoredSnapshot, ignoredKey, snapshot)
      ) {
        return;
      }
      ignoredSnapshot = null;
      ignoredKey = null;
      upsertPage(pageId, snapshot);
    },
    applyWithoutSync(apply: () => PageFormValues | null | void) {
      paused += 1;
      try {
        const applied = apply();
        if (applied) {
          ignoredSnapshot = applied;
          ignoredKey = pageFormSnapshotKey(applied);
        }
      } finally {
        paused -= 1;
      }
    },
  };
}
