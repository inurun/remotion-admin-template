/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import {
  createContext,
  readContext,
  type HfNode,
} from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import { SavedPage } from "@/_schemas";

export type IntroPageProps = {
  page: SavedPage;
};

export function useIntroPageProviderValue(page: IntroPageProps) {
  return {
    ...page,
  };
}

const IntroPageContext = createContext<ReturnType<typeof useIntroPageProviderValue> | null>(null);

export function IntroPageContextProvider({
  page,
  children,
}: IntroPageProps & {
  children: HfNode;
}) {
  const value = useIntroPageProviderValue({ page });
  return <IntroPageContext.Provider value={value}>{children}</IntroPageContext.Provider>;
}

export function useIntroPageContext() {
  const context = readContext(IntroPageContext);
  if (!context) {
    throw new Error("IntroPageContext is missing");
  }
  return context;
}
