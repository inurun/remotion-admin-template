import { useFormContext, useWatch } from "react-hook-form";
import type { Control } from "react-hook-form";
import type {
  CommentsPageFormValues,
  PageFormValues,
} from "@/app/features/page/model/page-form-schema";
import { normalizeCommentGroupDisplayText } from "@/app/features/comments/comment-operations";

export function useGroupDisplayTextField({
  groupIndex,
  firstCommentIndex,
}: {
  groupIndex: number;
  firstCommentIndex: number;
}) {
  const { control, setValue } = useFormContext<PageFormValues>();
  const commentsControl = control as unknown as Control<CommentsPageFormValues>;
  const displayText = useWatch({
    control: commentsControl,
    name: `commentGroups.${groupIndex}.displayText`,
  });
  const fallbackBody = useWatch({
    control: commentsControl,
    name: `comments.${Math.max(firstCommentIndex, 0)}.body`,
    disabled: firstCommentIndex < 0,
  });

  const fieldName = `commentGroups.${groupIndex}.displayText` as const;

  return {
    value: displayText ?? "",
    placeholder: typeof fallbackBody === "string" ? fallbackBody : "",
    changeDisplayText: (next: string) => {
      setValue(fieldName, next === "" ? null : next, { shouldDirty: true });
    },
    commitDisplayText: (next: string) => {
      setValue(fieldName, normalizeCommentGroupDisplayText(next === "" ? null : next), {
        shouldDirty: true,
      });
    },
  };
}
