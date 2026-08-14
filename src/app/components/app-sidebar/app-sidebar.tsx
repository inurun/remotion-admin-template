import { Accordion } from "@/_shared/components/ui/accordion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/_shared/components/ui/sidebar";
import { AddProjectDialog } from "@/app/components/app-sidebar/add-dialog/add-dialog";
import { Directory } from "@/app/components/app-sidebar/directory/directory";
import { SettingsDialog } from "@/app/components/app-sidebar/settings-dialog/settings-dialog";
import {
  useAppSidebarContent,
  useAppSidebarShell,
} from "@/app/components/app-sidebar/use-app-sidebar";

function AppSidebarContent() {
  const { projects, projectPath, groups } = useAppSidebarContent();

  return (
    <>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="gap-1 px-3 py-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <div className="flex w-full items-center justify-between gap-2 text-sm font-semibold">
            <span className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden font-serif">
              Projects
            </span>
            <AddProjectDialog />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="pt-0">
            <SidebarGroupContent className="group-data-[collapsible=icon]:hidden">
              {projects.length > 0 && (
                <Accordion
                  defaultValue={groups.map((group) => group.directoryPath || "root")}
                  multiple
                  className="w-full"
                >
                  {groups.map((group) => (
                    <Directory
                      key={group.directoryPath || "root"}
                      directoryName={group.directoryName}
                      directoryPath={group.directoryPath}
                      items={group.items}
                      selectedProjectPath={projectPath}
                    />
                  ))}
                </Accordion>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="flex-row items-center justify-end gap-1 px-3 py-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-2">
          <SettingsDialog />
          <SidebarTrigger />
        </SidebarFooter>
      </Sidebar>
      <SidebarRail />
    </>
  );
}

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { open, onOpenChange } = useAppSidebarShell();

  return (
    <SidebarProvider open={open} onOpenChange={onOpenChange}>
      <AppSidebarContent />
      {children}
    </SidebarProvider>
  );
}
