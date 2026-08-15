import { Plus } from "lucide-react";
import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import { Button } from "@/_shared/components/ui/button";
import { EndcardListItem } from "./endcard-list-item/endcard-list-item";

type EndcardListField = {
  fieldKey: string;
  id: string;
};

export function EndcardList({
  label,
  emptyLabel,
  fields,
  onAdd,
  onRemove,
  onDragEnd,
  children,
}: {
  label: string;
  emptyLabel: string;
  fields: EndcardListField[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
  children: (index: number) => React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        {label ? <p className="text-sm font-medium">{label}</p> : <span />}
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus />
          Add
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <DragDropProvider onDragEnd={onDragEnd}>
          <div className="grid gap-2">
            {fields.map((field, index) => (
              <EndcardListItem
                key={field.fieldKey}
                itemId={field.id}
                index={index}
                onRemove={() => onRemove(index)}
              >
                {children(index)}
              </EndcardListItem>
            ))}
          </div>
        </DragDropProvider>
      )}
    </div>
  );
}
