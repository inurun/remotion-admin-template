import { useSaveProjectChanges } from "@/app/features/editor/lib/use-save-project-changes";

export function useEditor() {
  return useSaveProjectChanges();
}
