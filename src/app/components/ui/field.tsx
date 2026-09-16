import { useMemo } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/_shared/lib/utils";

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group flex w-full flex-col gap-5 *:data-[slot=field-group]:gap-4",
        className,
      )}
      {...props}
    />
  );
}

const fieldVariants = cva("group/field flex w-full gap-2 data-[invalid=true]:text-destructive", {
  variants: {
    orientation: {
      vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
      horizontal: "flex-row items-center *:data-[slot=field-label]:flex-auto",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  const getErrorMessages = () => {
    if (!errors?.length) {
      return [];
    }

    return [...new Map(errors.map((error) => [error?.message, error?.message])).values()].filter(
      Boolean,
    ) as string[];
  };

  const content = useMemo(() => {
    if (children) {
      return children;
    }

    const messages = getErrorMessages();
    if (messages.length === 0) {
      return null;
    }

    if (messages.length === 1) {
      return messages[0];
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("text-sm font-normal text-destructive", className)}
      {...props}
    >
      {content}
    </div>
  );
}

export { Field, FieldError, FieldGroup };
