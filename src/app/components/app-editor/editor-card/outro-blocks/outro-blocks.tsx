import { Plus } from "lucide-react";
import { DragDropProvider } from "@dnd-kit/react";
import { Button } from "@/_shared/components/ui/button";
import { FieldGroup } from "@/_shared/components/ui/field";
import { OutroBlockItem } from "./outro-block-item/outro-block-item";
import { useOutroBlocks } from "./use-outro-blocks";

export function OutroBlocks() {
  const { fields, addBlock, removeBlock, handleDragEnd } = useOutroBlocks();

  return (
    <FieldGroup className="gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addBlock}>
          <Plus />
          Add block
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">No blocks</p>
      ) : (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div className="grid gap-4">
            {fields.map((field, index) => (
              <OutroBlockItem
                key={field.fieldKey}
                index={index}
                blockId={field.id}
                onRemove={() => removeBlock(index)}
              />
            ))}
          </div>
        </DragDropProvider>
      )}
    </FieldGroup>
  );
}
