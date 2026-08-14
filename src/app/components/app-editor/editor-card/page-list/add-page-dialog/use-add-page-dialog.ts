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
import { usePage, createBlankDraftPage, createBlankDraftTransition } from "@/app/features/page";
import { useTts } from "@/app/features/tts";

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
  const { pageFields, appendPage, setSelectedPageIndex } = usePage();
  const { clearSelection } = useTts();
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
    setSelectedPageIndex(pageFields.length);
    clearSelection();

    const parsed = parseAddableType(values.type);
    if (parsed.kind === "transition") {
      appendPage(
        createBlankDraftTransition({
          id: createUuid(),
          variant: parsed.variant,
        }),
      );
    } else {
      appendPage(
        createBlankDraftPage({
          id: createUuid(),
          title: values.title,
          type: parsed.type,
        }),
      );
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
