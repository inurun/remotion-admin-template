import { Link2 } from "lucide-react";
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
import { Field, FieldError } from "@/_shared/components/ui/field";
import { Input } from "@/_shared/components/ui/input";
import { OUTRO_BLOCK_URL_PLACEHOLDER } from "@/app/features/page/lib/outro-block";
import { useOgpDialog } from "./use-ogp-dialog";

export function OgpDialog({ index }: { index: number }) {
  const dialog = useOgpDialog(index);

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.handleOpenChange}>
      <DialogTrigger render={<Button type="button" size="icon-xs" variant="outline" title="OGP" />}>
        <Link2 />
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,420px)]">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void dialog.fetchAndApplyOgp();
          }}
        >
          <DialogHeader>
            <DialogTitle>OGP</DialogTitle>
          </DialogHeader>
          <Field data-invalid={Boolean(dialog.error)}>
            <Input
              autoFocus
              value={dialog.url}
              onChange={(event) => dialog.setUrl(event.target.value)}
              placeholder={OUTRO_BLOCK_URL_PLACEHOLDER}
            />
            {dialog.error ? <FieldError>{dialog.error}</FieldError> : null}
          </Field>
          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="outline" disabled={dialog.pending} />}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={dialog.pending}>
              {dialog.pending ? "..." : "Fetch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
