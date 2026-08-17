import type { ReactNode } from "react";
import { usePageEditorProviders } from "@/app/components/app-editor/page-editor-providers/use-page-editor-providers";
import { PageFormProvider } from "@/app/features/page/context/page-form-context";
import { SelectedTtsProvider } from "@/app/features/tts/context/selected-tts-state";
import { TtsContextProvider } from "@/app/features/tts/context/tts-context";
import { TtsTextFocusContextProvider } from "@/app/features/tts/context/tts-text-focus-context";

export function PageEditorProviders({ children }: { children: ReactNode }) {
  const { pageId } = usePageEditorProviders();

  return (
    <PageFormProvider pageId={pageId}>
      <SelectedTtsProvider pageId={pageId}>
        <TtsContextProvider>
          <TtsTextFocusContextProvider pageId={pageId}>{children}</TtsTextFocusContextProvider>
        </TtsContextProvider>
      </SelectedTtsProvider>
    </PageFormProvider>
  );
}
