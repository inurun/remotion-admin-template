import { DragDropProvider } from "@dnd-kit/react";
import { FieldGroup } from "@/_shared/components/ui/field";
import { useTtsList } from "@/app/components/app-editor/editor-card/tts-list/use-tts-list";
import { TtsItem } from "@/app/components/app-editor/editor-card/tts-list/tts-item/tts-item";
import { AddTtsButton } from "./add-tts-button/add-tts-button";

export function TtsList() {
  const {
    fields,
    removeTts,
    insertTtsAfter,
    appendTts,
    handleDragEnd,
    selectTtsOnFocus,
    selectTts,
  } = useTtsList();

  return (
    <FieldGroup className="gap-5 grid relative min-h-10 pb-10">
      <AddTtsButton onAppend={appendTts} />
      {fields.length === 0 ? null : (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div className="grid gap-5">
            {fields.map((field, index) => (
              <TtsItem
                key={field.fieldKey}
                index={index}
                ttsId={field.id}
                onInsertAfter={insertTtsAfter}
                onRemove={() => removeTts(index)}
                onSelect={selectTts}
                onFocus={selectTtsOnFocus}
              />
            ))}
          </div>
        </DragDropProvider>
      )}
    </FieldGroup>
  );
}
