import { Copy } from "lucide-react";
import type { ProjectFileSummary } from "@/server/features/project/contract";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogMain,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { SidebarMenuAction } from "@/app/components/ui/sidebar";
import { useDuplicateProjectDialog } from "@/app/components/app-sidebar/duplicate-dialog/use-duplicate-project-dialog";

export function DuplicateProjectDialog({ project }: { project: ProjectFileSummary }) {
  const { defaultProjectPath, isPending, submit } = useDuplicateProjectDialog(project);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <SidebarMenuAction
            showOnHover
            title={`${project.name} を複製`}
            aria-label={`${project.name} を複製`}
          />
        }
      >
        <Copy />
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[min(92vw,420px)]">
        <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Project 複製</DialogTitle>
            <DialogDescription>保存先の project path を入力する。</DialogDescription>
          </DialogHeader>
          <DialogMain>
            <label className="grid gap-2 text-sm font-medium">
              Project path
              <Input
                name="projectPath"
                autoFocus
                defaultValue={defaultProjectPath}
                placeholder="project-name"
                required
              />
            </label>
          </DialogMain>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>
              閉じる
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              複製
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
