import { createContext, useContext } from "react";
import { FormProvider } from "react-hook-form";
import { useFormProviderValue } from "@/app/features/editor/context/use-form-context";
import { useProject } from "@/app/features/project";
import { useSettings } from "@/app/features/settings";

const FormContext = createContext<ReturnType<typeof useFormProviderValue>["value"] | null>(null);

export function FormContextProvider({ children }: { children: React.ReactNode }) {
  const { project } = useProject();
  const { options } = useSettings();
  const { form, value } = useFormProviderValue({
    initialProject: project,
    voiceOptions: options,
  });

  return (
    <FormProvider {...form}>
      <FormContext.Provider value={value}>{children}</FormContext.Provider>
    </FormProvider>
  );
}

export function useForm() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("FormContext is missing");
  }
  return context;
}

export { getVoiceValue } from "@/app/features/editor/context/use-form-context";
