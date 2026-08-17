import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import {
  applyPageFormSavedSpeech,
  applyPageFormSwitch,
  createIdlePageFormValues,
  createPageFormWatchSync,
  isPageFormScopeReady,
  resolvePageFormSwitchValues,
  selectPageFormDefaultValues,
  shouldSyncPageFormWatch,
} from "@/app/features/page/lib/page-form-sync";
import { selectItemReconcileRevision } from "@/app/features/editor/store/editor-session-state";
import {
  useEditorSession,
  useEditorSessionStoreApi,
} from "@/app/features/editor/store/editor-session-store-context";

const idlePageFormValues = createIdlePageFormValues();

type PageFormScopeValue = {
  pageId: string | null;
  readyPageId: string | null;
  isReady: boolean;
};

const PageFormScopeContext = createContext<PageFormScopeValue | null>(null);

function PageFormProviderInner({
  pageId,
  page,
  children,
}: {
  pageId: string | null;
  page: PageFormValues | null;
  children: ReactNode;
}) {
  const upsertPage = useEditorSession((state) => state.upsertPage);
  const reconcileRevision = useEditorSession((state) =>
    pageId ? selectItemReconcileRevision(state, pageId) : 0,
  );
  const editorStore = useEditorSessionStoreApi();
  const form = useForm<PageFormValues>({
    defaultValues: page ?? idlePageFormValues,
  });
  const upsertPageRef = useRef(upsertPage);
  upsertPageRef.current = upsertPage;
  const pageIdRef = useRef(pageId);
  pageIdRef.current = pageId;
  const formRef = useRef(form);
  formRef.current = form;
  const [readyPageId, setReadyPageId] = useState(pageId);
  const readyPageIdRef = useRef(readyPageId);
  const syncRef = useRef(
    createPageFormWatchSync((id, nextPage) => {
      upsertPageRef.current(id, nextPage);
    }),
  );

  useEffect(() => {
    const sync = syncRef.current;
    const subscription = form.watch(() => {
      const currentPageId = pageIdRef.current;
      if (!shouldSyncPageFormWatch(currentPageId, readyPageIdRef.current)) {
        return;
      }
      sync.sync(currentPageId, () => form.getValues());
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useLayoutEffect(() => {
    const next = resolvePageFormSwitchValues(editorStore.getState(), pageId, idlePageFormValues);
    syncRef.current.applyWithoutSync(() => applyPageFormSwitch(formRef.current, next));
    readyPageIdRef.current = pageId;
    setReadyPageId(pageId);
  }, [editorStore, pageId]);

  useEffect(() => {
    if (!pageId || reconcileRevision === 0) {
      return;
    }
    if (!isPageFormScopeReady(pageId, readyPageIdRef.current)) {
      return;
    }
    const sessionPage = selectPageFormDefaultValues(editorStore.getState(), pageId);
    if (!sessionPage) {
      return;
    }
    syncRef.current.applyWithoutSync(() => applyPageFormSavedSpeech(formRef.current, sessionPage));
  }, [editorStore, pageId, reconcileRevision]);

  const scope = useMemo(
    () => ({
      pageId,
      readyPageId,
      isReady: isPageFormScopeReady(pageId, readyPageId),
    }),
    [pageId, readyPageId],
  );

  return (
    <PageFormScopeContext.Provider value={scope}>
      <FormProvider {...form}>{children}</FormProvider>
    </PageFormScopeContext.Provider>
  );
}

export function PageFormProvider({
  pageId,
  children,
}: {
  pageId: string | null;
  children: ReactNode;
}) {
  const editorStore = useEditorSessionStoreApi();
  const page = pageId ? selectPageFormDefaultValues(editorStore.getState(), pageId) : null;

  return (
    <PageFormProviderInner pageId={pageId} page={page}>
      {children}
    </PageFormProviderInner>
  );
}

export function usePageFormScope() {
  const context = useContext(PageFormScopeContext);
  if (!context) {
    throw new Error("PageFormScope is missing");
  }
  return context;
}
