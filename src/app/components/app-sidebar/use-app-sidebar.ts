import { useProject } from "@/app/features/project";
import { useUiPreferencesStore } from "@/app/features/ui/storage/use-ui-preferences-store";
import { groupProjectsByDirectory } from "@/app/components/app-sidebar/directory/directory.lib";

export function useAppSidebarShell() {
  const open = useUiPreferencesStore((state) => state.sidebarOpen);
  const onOpenChange = useUiPreferencesStore((state) => state.setSidebarOpen);

  return {
    open,
    onOpenChange,
  };
}

export function useAppSidebarContent() {
  const { projects, projectPath } = useProject();
  const groups = groupProjectsByDirectory(projects);

  return {
    projects,
    projectPath,
    groups,
  };
}
