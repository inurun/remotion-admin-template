import { Controller, useFormContext } from "react-hook-form";
import { GripVertical, Link2, Trash2 } from "lucide-react";
import type { DraftProject } from "@/_schemas";
import { Button } from "@/_shared/components/ui/button";
import { Field, FieldError } from "@/_shared/components/ui/field";
import { Input } from "@/_shared/components/ui/input";
import { Textarea } from "@/_shared/components/ui/textarea";
import { cn } from "@/_shared/lib/utils";
import { useSelectedPage } from "@/app/features/page";
import { useOutroBlockItem } from "./use-outro-block-item";
import { useOutroBlockItemOgp } from "./use-outro-block-item-ogp";

export function OutroBlockItem({
  index,
  blockId,
  onRemove,
}: {
  index: number;
  blockId: string;
  onRemove: () => void;
}) {
  const { control } = useFormContext<DraftProject>();
  const { selectedPageIndex } = useSelectedPage();
  const { ref, handleRef, isDragging } = useOutroBlockItem(blockId, index);
  const { pending, error, fetchAndApplyOgp } = useOutroBlockItemOgp(index);
  const baseName = `pages.${selectedPageIndex}.meta.blocks.${index}` as const;

  return (
    <article
      ref={ref}
      data-dragging={isDragging}
      className={cn(
        "grid gap-3 rounded-lg border border-border bg-card p-3 transition data-[dragging=true]:opacity-70",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          ref={handleRef}
          className="inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground active:cursor-grabbing"
          title="Reorder"
        >
          <GripVertical className="size-4" />
        </span>
        <div className="min-w-0 flex-1 text-sm font-medium text-muted-foreground">
          Block {index + 1}
        </div>
        <Button
          type="button"
          size="icon-xs"
          variant="destructive"
          onClick={onRemove}
          title="Delete"
        >
          <Trash2 />
        </Button>
      </div>

      <Field>
        <div className="flex gap-2">
          <Controller
            control={control}
            name={`${baseName}.url`}
            render={({ field }) => <Input {...field} placeholder="https://" className="flex-1" />}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={fetchAndApplyOgp}
            disabled={pending}
          >
            <Link2 />
            {pending ? "..." : "OGP"}
          </Button>
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>

      <Field>
        <Controller
          control={control}
          name={`${baseName}.title`}
          render={({ field }) => <Input {...field} placeholder="Title" />}
        />
      </Field>

      <Field>
        <Controller
          control={control}
          name={`${baseName}.description`}
          render={({ field }) => <Textarea {...field} placeholder="OGP description" rows={2} />}
        />
      </Field>

      <Field>
        <Controller
          control={control}
          name={`${baseName}.image`}
          render={({ field }) => (
            <Input
              value={field.value ?? ""}
              onChange={(event) => field.onChange(event.target.value || null)}
              placeholder="Image URL"
            />
          )}
        />
      </Field>

      <Field>
        <Controller
          control={control}
          name={`${baseName}.impression`}
          render={({ field }) => <Textarea {...field} placeholder="Impression" rows={3} />}
        />
      </Field>
    </article>
  );
}
