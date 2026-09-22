import { useFormContext, useWatch } from "react-hook-form";
import type { Control } from "react-hook-form";
import type {
  CommentsPageFormValues,
  PageFormValues,
} from "@/app/features/page/model/page-form-schema";

export function useCommentRow(commentIndex: number) {
  const { control, setValue } = useFormContext<PageFormValues>();
  const commentsControl = control as unknown as Control<CommentsPageFormValues>;
  const body = useWatch({
    control: commentsControl,
    name: `comments.${commentIndex}.body`,
  });
  const fieldName = `comments.${commentIndex}.body` as const;

  return {
    body: body ?? "",
    changeBody: (next: string) => {
      setValue(fieldName, next, { shouldDirty: true });
    },
  };
}
