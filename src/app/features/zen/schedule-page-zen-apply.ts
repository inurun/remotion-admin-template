import { AUTO_SAVE_DELAY } from "@/constants";
import type { ParseZenScriptResult } from "@/app/features/zen/types";

export function schedulePageZenApply({
  enabled,
  source,
  appliedSource,
  parsed,
  apply,
  save,
}: {
  enabled: boolean;
  source: string;
  appliedSource: string;
  parsed: ParseZenScriptResult;
  apply: () => boolean | undefined;
  save: () => Promise<void>;
}) {
  if (
    !enabled ||
    source === appliedSource ||
    !source.trim() ||
    parsed.errors.length > 0 ||
    parsed.pages.length !== 1
  )
    return;
  const timer = setTimeout(() => {
    if (apply()) void save().catch(() => {});
  }, AUTO_SAVE_DELAY);
  return () => clearTimeout(timer);
}
