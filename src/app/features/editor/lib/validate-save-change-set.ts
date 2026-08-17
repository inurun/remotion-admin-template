import { ZodError } from "zod";
import { pageFormSchema } from "@/app/features/page/model/page-form-schema";
import { transitionFormSchema } from "@/app/features/page/model/transition-form-schema";
import { projectSettingsFormSchema } from "@/app/features/project/model/project-settings-form-schema";
import type { SaveProjectChangesInput } from "@/app/features/editor/store/editor-session-state";

export function validateChangeSet(changeSet: SaveProjectChangesInput) {
  try {
    if (changeSet.project) {
      projectSettingsFormSchema.parse(changeSet.project);
    }
    for (const item of changeSet.upsertItems) {
      if (item.type === "transition") {
        transitionFormSchema.parse(item);
      } else {
        pageFormSchema.parse(item);
      }
    }
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(error.issues[0]?.message ?? "Validation failed");
    }
    throw error;
  }
}

export function isEmptyChangeSet(changeSet: SaveProjectChangesInput) {
  return (
    !changeSet.project &&
    changeSet.upsertItems.length === 0 &&
    changeSet.removedItemIds.length === 0 &&
    !changeSet.sequenceOrder &&
    !changeSet.forceResynthesis
  );
}
