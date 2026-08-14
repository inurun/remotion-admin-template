import { cn } from "@/_shared/lib/utils";
import { useJobLogPanel } from "@/app/components/app-header/job-log-panel/use-job-log-panel";

type JobLogPanelProps = {
  logs: string[];
  emptyLabel?: string;
  className?: string;
};

export function JobLogPanel({ logs, emptyLabel = "No logs yet.", className }: JobLogPanelProps) {
  const panel = useJobLogPanel(logs);

  return (
    <div
      ref={panel.containerRef}
      className={cn(
        "min-h-[220px] max-h-[320px] overflow-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs leading-6 text-foreground",
        className,
      )}
    >
      {logs.length === 0 ? (
        <div className="text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="grid gap-0.5">
          {logs.map((line, index) => (
            <div
              key={`${index}:${line}`}
              className="job-log-line whitespace-pre-wrap wrap-break-word"
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
