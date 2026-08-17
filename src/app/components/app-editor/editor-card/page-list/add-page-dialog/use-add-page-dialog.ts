import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createUuid } from "@/_shared/lib/utils";
import {
  pageTypeSchema,
  transitionVariantSchema,
  type PageType,
  type TransitionVariant,
} from "@/_schemas";
import { createBlankPageInput, createBlankTransitionInput } from "@/app/features/page";
import { useEditorSession } from "@/app/features/editor";
import { useProjectRoute } from "@/app/features/project/context/project-route-context";
import { getProjectPageHref } from "@/app/features/project/lib/project-route";

const PAGE_TYPE_VALUES = pageTypeSchema.options;
const TRANSITION_VARIANT_VALUES = transitionVariantSchema.options;
const TRANSITION_TYPE_VALUES = TRANSITION_VARIANT_VALUES.map(
  (variant) => `transition:${variant}` as const,
);
const ADDABLE_TYPE_VALUES = [...PAGE_TYPE_VALUES, ...TRANSITION_TYPE_VALUES] as const;

const DEFAULT_VALUES: AddPageFormValues = {
  title: "",
  type: "main",
};

const addPageFormSchema = z.object({
  title: z.string(),
  type: z.enum(ADDABLE_TYPE_VALUES),
});

type AddPageFormValues = z.infer<typeof addPageFormSchema>;

type AddableOption = {
  value: (typeof ADDABLE_TYPE_VALUES)[number];
  label: string;
};

function parseAddableType(
  value: AddPageFormValues["type"],
): { kind: "page"; type: PageType } | { kind: "transition"; variant: TransitionVariant } {
  if (value.startsWith("transition:")) {
    const variant = transitionVariantSchema.parse(value.slice("transition:".length));
    return { kind: "transition", variant };
  }

  return { kind: "page", type: pageTypeSchema.parse(value) };
}

export function useAddPageDialog() {
  const insertSequenceItem = useEditorSession((state) => state.insertSequenceItem);
  const sequenceOrder = useEditorSession((state) => state.sequenceOrder);
  const { projectPath, navigate } = useProjectRoute();
  const [open, setOpen] = useState(false);
  const form = useForm<AddPageFormValues>({
    resolver: zodResolver(addPageFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const selectedType = form.watch("type");
  const isTransitionType = selectedType.startsWith("transition:");

  const typeOptions: AddableOption[] = [
    ...PAGE_TYPE_VALUES.map((type) => ({
      value: type,
      label: type,
    })),
    ...TRANSITION_VARIANT_VALUES.map((variant) => ({
      value: `transition:${variant}` as const,
      label: variant,
    })),
  ];

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        form.reset(DEFAULT_VALUES);
      }
    },
    [form],
  );

  const submit = form.handleSubmit((values) => {
    const parsed = parseAddableType(values.type);
    const item =
      parsed.kind === "transition"
        ? createBlankTransitionInput({
            id: createUuid(),
            variant: parsed.variant,
          })
        : createBlankPageInput({
            id: createUuid(),
            title: values.title,
            type: parsed.type,
          });
    insertSequenceItem(item, sequenceOrder.length);
    if (projectPath) {
      navigate(getProjectPageHref(projectPath, item.id));
    }
    setOpen(false);
  });

  return {
    form,
    open,
    typeOptions,
    isTransitionType,
    handleOpenChange,
    submit,
  };
}
