/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import {
  createContext,
  readContext,
  type HfNode,
} from "@inurun/vite-plugin-hyperframes-jsx/runtime";
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
  children: HfNode;
}) {
  const value = useMainPageProviderValue({ page });
  return <MainPageContext.Provider value={value}>{children}</MainPageContext.Provider>;
}

export function useMainPageContext() {
  const context = readContext(MainPageContext);
  if (!context) {
    throw new Error("MainPageContext is missing");
  }
  return context;
}
