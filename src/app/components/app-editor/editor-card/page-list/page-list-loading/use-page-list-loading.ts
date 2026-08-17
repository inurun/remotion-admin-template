import { useSavedProject } from "@/app/features/editor/store/saved-project-store-context";

export function usePageListLoading() {
  const width = useSavedProject((state) => state.project.meta.width);
  const height = useSavedProject((state) => state.project.meta.height);

  return {
    aspectRatio: `${width} / ${height}`,
  };
}
