import { createContext, useContext, type ReactNode } from "react";

type SelectedPageContextValue = {
  selectedPageIndex: number;
};

const SelectedPageContext = createContext<SelectedPageContextValue | null>(null);

export function SelectedPageContextProvider({
  pageIndex,
  children,
}: {
  pageIndex: number;
  children: ReactNode;
}) {
  return (
    <SelectedPageContext.Provider value={{ selectedPageIndex: pageIndex }}>
      {children}
    </SelectedPageContext.Provider>
  );
}

export function useSelectedPage() {
  const context = useContext(SelectedPageContext);
  if (!context) {
    throw new Error("SelectedPageContext is missing");
  }
  return context;
}
