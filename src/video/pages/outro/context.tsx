/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import {
  createContext,
  readContext,
  type HfNode,
} from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import type { SavedPage } from "@/_schemas";

export type OutroPageProps = {
  page: SavedPage;
};

export function useOutroPageProviderValue({ page }: OutroPageProps) {
  return { page };
}

const OutroPageContext = createContext<ReturnType<typeof useOutroPageProviderValue> | null>(null);

export function OutroPageContextProvider({
  page,
  children,
}: OutroPageProps & {
  children: HfNode;
}) {
  const value = useOutroPageProviderValue({ page });
  return <OutroPageContext.Provider value={value}>{children}</OutroPageContext.Provider>;
}

export function useOutroPageContext() {
  const context = readContext(OutroPageContext);
  if (!context) {
    throw new Error("OutroPageContext is missing");
  }
  return context;
}
