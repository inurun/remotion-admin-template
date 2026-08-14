import { Plus } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/_shared/components/ui/dialog";
import { Input } from "@/_shared/components/ui/input";
import { useAddProjectDialog } from "@/app/components/app-sidebar/add-dialog/use-add-project-dialog";

export function AddProjectDialog() {
  const { defaultProjectPath, isPending, submit } = useAddProjectDialog();

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            title="Project 追加"
            aria-label="Project 追加"
          />
        }
      >
        <Plus />
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,420px)]">
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
          </DialogHeader>
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
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>
              閉じる
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              作成
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
