import { createContext, useContext } from "react";
import { useEditorProviderValue } from "@/app/features/editor/context/use-editor-context";

const EditorContext = createContext<ReturnType<typeof useEditorProviderValue> | null>(null);

export function EditorContextProvider({ children }: { children: React.ReactNode }) {
  const value = useEditorProviderValue();
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("EditorContext is missing");
  }
  return context;
}
