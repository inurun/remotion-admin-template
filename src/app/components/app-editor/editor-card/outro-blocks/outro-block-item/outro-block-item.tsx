import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { Field } from "@/_shared/components/ui/field";
import { Textarea } from "@/_shared/components/ui/textarea";
import { cn } from "@/_shared/lib/utils";
import { OUTRO_BLOCK_URL_PLACEHOLDER } from "@/app/features/page/lib/outro-block";
import { OgpDialog } from "./ogp-dialog/ogp-dialog";
import { useOutroBlockItem } from "./use-outro-block-item";

export function OutroBlockItem({
  index,
  blockId,
  onRemove,
}: {
  index: number;
  blockId: string;
  onRemove: () => void;
}) {
  const { control } = useFormContext<PageFormValues>();
  const { ref, handleRef, isDragging } = useOutroBlockItem(blockId, index);
  const { url, title, description, image } = useWatch({ control, name: `meta.blocks.${index}` });

  return (
    <article
      ref={ref}
      data-dragging={isDragging}
      className={cn(
        "grid gap-2 rounded-lg border border-border bg-card p-3 transition data-[dragging=true]:opacity-70",
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
        <div
          className={cn(
            "min-w-0 flex-1 truncate text-xs text-muted-foreground",
            !url && "opacity-50",
          )}
        >
          {url || OUTRO_BLOCK_URL_PLACEHOLDER}
        </div>
        <OgpDialog index={index} />
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

      <div className="flex gap-2">
        {image ? <img src={image} alt={title} className="h-16 pl-2 aspect-video shrink-0" /> : null}
        <div>
          {title ? <p className="text-xs text-muted-foreground font-bold">{title}</p> : null}
          {description ? (
            <p className="line-clamp-3 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>

      <Field>
        <Controller
          control={control}
          name={`meta.blocks.${index}.impression`}
          render={({ field }) => <Textarea {...field} />}
        />
      </Field>
    </article>
  );
}
