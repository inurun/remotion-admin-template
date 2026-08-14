import { createContext, useContext } from "react";
import { useSettingsProviderValue } from "@/app/features/settings/context/use-settings-context";

const SettingsContext = createContext<ReturnType<typeof useSettingsProviderValue> | null>(null);

export function SettingsContextProvider({ children }: { children: React.ReactNode }) {
  const value = useSettingsProviderValue();
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("SettingsContext is missing");
  }
  return context;
}
