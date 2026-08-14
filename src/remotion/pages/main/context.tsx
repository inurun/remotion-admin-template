import { createContext, useContext } from "react";
import { SavedPage } from "@/_schemas";

export type MainPageProps = {
  page: SavedPage;
};

export function useMainPageProviderValue(page: MainPageProps) {
  return {
    ...page,
  };
}

const MainPageContext = createContext<ReturnType<typeof useMainPageProviderValue> | null>(null);

export function MainPageContextProvider({
  page,
  children,
}: MainPageProps & {
  children: React.ReactNode;
}) {
  const value = useMainPageProviderValue({ page });
  return <MainPageContext.Provider value={value}>{children}</MainPageContext.Provider>;
}

export function useMainPageContext() {
  const context = useContext(MainPageContext);
  if (!context) {
    throw new Error("MainPageContext is missing");
  }
  return context;
}
