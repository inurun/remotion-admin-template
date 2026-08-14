import { FolderOpen, File } from "lucide-react";
import type { ProjectFileSummary } from "@/_schemas";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/_shared/components/ui/accordion";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/_shared/components/ui/sidebar";
import { getProjectHref } from "@/app/features/project/lib/project-path";
import { cn } from "@/_shared/lib/utils";
import { DuplicateProjectDialog } from "@/app/components/app-sidebar/duplicate-dialog/duplicate-dialog";
import { useDirectory } from "@/app/components/app-sidebar/directory/use-directory";

export function Directory({
  directoryName,
  directoryPath,
  items,
  selectedProjectPath,
  className,
  style,
}: {
  directoryName: string;
  directoryPath: string;
  items: ProjectFileSummary[];
  selectedProjectPath: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const directory = useDirectory({
    directoryName,
    directoryPath,
    items,
    selectedProjectPath,
  });

  return (
    <AccordionItem
      value={directory.accordionValue}
      className={cn("border-none", className)}
      style={style}
    >
      <AccordionTrigger className="px-2 py-2 hover:no-underline">
        <span className="flex items-center gap-2">
          <FolderOpen className="size-4" />
          <span>{directory.directoryName}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-0">
        <SidebarMenu>
          {directory.items.map((project, i) => (
            <SidebarMenuItem
              key={project.path}
              className="animate-in fade-in fill-mode-both pl-2"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <SidebarMenuButton
                render={<a href={getProjectHref(project.path)} />}
                isActive={project.path === directory.selectedProjectPath}
                className="gap-2"
              >
                <File className="size-4" />
                <span>{project.name}</span>
              </SidebarMenuButton>
              <DuplicateProjectDialog project={project} />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </AccordionContent>
    </AccordionItem>
  );
}
