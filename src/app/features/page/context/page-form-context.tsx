import { useEffect, useRef, type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import {
  applyPageFormSavedSpeech,
  createPageFormWatchSync,
  selectPageFormDefaultValues,
} from "@/app/features/page/lib/page-form-sync";
import { selectItemReconcileRevision } from "@/app/features/editor/store/editor-session-state";
import {
  useEditorSession,
  useEditorSessionStoreApi,
} from "@/app/features/editor/store/editor-session-store-context";

function PageFormProviderInner({ page, children }: { page: PageFormValues; children: ReactNode }) {
  const pageId = page.id;
  const upsertPage = useEditorSession((state) => state.upsertPage);
  const reconcileRevision = useEditorSession((state) => selectItemReconcileRevision(state, pageId));
  const editorStore = useEditorSessionStoreApi();
  const form = useForm<PageFormValues>({
    defaultValues: page,
  });
  const syncRef = useRef(createPageFormWatchSync(upsertPage));

  useEffect(() => {
    const sync = createPageFormWatchSync(upsertPage);
    syncRef.current = sync;
    const subscription = form.watch(() => {
      sync.sync(pageId, () => form.getValues());
    });
    return () => subscription.unsubscribe();
  }, [form, pageId, upsertPage]);

  useEffect(() => {
    if (reconcileRevision === 0) {
      return;
    }
    const sessionPage = selectPageFormDefaultValues(editorStore.getState(), pageId);
    if (!sessionPage) {
      return;
    }
    syncRef.current.applyWithoutSync(() => applyPageFormSavedSpeech(form, sessionPage));
  }, [editorStore, form, pageId, reconcileRevision]);

  return <FormProvider {...form}>{children}</FormProvider>;
}

export function PageFormProvider({ pageId, children }: { pageId: string; children: ReactNode }) {
  const pageType = useEditorSession((state) => state.itemsById[pageId]?.type);
  const editorStore = useEditorSessionStoreApi();
  if (!pageType || pageType === "transition") {
    return children;
  }

  const page = selectPageFormDefaultValues(editorStore.getState(), pageId);
  if (!page) {
    return children;
  }

  return (
    <PageFormProviderInner key={pageId} page={page}>
      {children}
    </PageFormProviderInner>
  );
}
