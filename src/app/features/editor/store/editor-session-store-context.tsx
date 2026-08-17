import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import type { SavedProject } from "@/_schemas";
import {
  createEditorSessionStore,
  type EditorSessionStore,
  type EditorSessionStoreApi,
} from "@/app/features/editor/store/editor-session-store";

const EditorSessionStoreContext = createContext<EditorSessionStoreApi | null>(null);

export function EditorSessionStoreProvider({
  initialProject,
  children,
}: {
  initialProject: SavedProject;
  children: ReactNode;
}) {
  const storeRef = useRef<EditorSessionStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createEditorSessionStore(initialProject);
  }

  return (
    <EditorSessionStoreContext.Provider value={storeRef.current}>
      {children}
    </EditorSessionStoreContext.Provider>
  );
}

export function useEditorSessionStoreApi() {
  const store = useContext(EditorSessionStoreContext);
  if (!store) {
    throw new Error("EditorSessionStore is missing");
  }
  return store;
}

export function useEditorSession<T>(selector: (state: EditorSessionStore) => T): T {
  return useStore(useEditorSessionStoreApi(), selector);
}
