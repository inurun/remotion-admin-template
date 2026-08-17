import { createContext, useContext, type ReactNode } from "react";

type SelectedPageContextValue = {
  pageId: string;
};

const SelectedPageContext = createContext<SelectedPageContextValue | null>(null);

export function SelectedPageContextProvider({
  pageId,
  children,
}: {
  pageId: string;
  children: ReactNode;
}) {
  return <SelectedPageContext.Provider value={{ pageId }}>{children}</SelectedPageContext.Provider>;
}

export function useSelectedPage() {
  const context = useContext(SelectedPageContext);
  if (!context) {
    throw new Error("SelectedPageContext is missing");
  }
  return context;
}
