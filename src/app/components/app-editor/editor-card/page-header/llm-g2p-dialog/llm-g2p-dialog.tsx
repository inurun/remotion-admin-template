import { Check, FlaskConical, Play } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogMain,
  DialogTitle,
  DialogTrigger,
} from "@/_shared/components/ui/dialog";
import { JobLogPanel } from "@/app/components/app-header/job-log-panel/job-log-panel";
import { useLlmG2pDialog } from "./use-llm-g2p-dialog";

export function LlmG2pDialog() {
  const dialog = useLlmG2pDialog();

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title="LLM G2P Lab"
            aria-label="LLM G2P Lab"
          />
        }
      >
        <FlaskConical />
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[min(94vw,860px)]">
        <DialogHeader>
          <DialogTitle>LLM G2P Lab</DialogTitle>
        </DialogHeader>
        <DialogMain className="grid gap-3">
          {dialog.pending ? (
            <p className="text-sm text-muted-foreground">
              Running page pipeline · {dialog.elapsedSec?.toFixed(1)}s
            </p>
          ) : null}
          {dialog.stale ? (
            <p className="text-sm text-destructive">Page changed after Run. Run again.</p>
          ) : null}
          {dialog.applied ? <p className="text-sm text-muted-foreground">Applied.</p> : null}
          <JobLogPanel logs={dialog.logs} emptyLabel="Run page analysis to collect logs." />
          {dialog.error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {dialog.error}
            </div>
          ) : null}
        </DialogMain>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Close</DialogClose>
          <Button
            type="button"
            variant="secondary"
            disabled={!dialog.canApply}
            onClick={dialog.apply}
          >
            <Check />
            Apply
          </Button>
          <Button type="button" disabled={!dialog.canRun} onClick={() => void dialog.run()}>
            <Play />
            Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
