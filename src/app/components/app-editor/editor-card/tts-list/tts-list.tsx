import { DragDropProvider } from "@dnd-kit/react";
import { FieldGroup } from "@/app/components/ui/field";
import { useTtsList } from "@/app/components/app-editor/editor-card/tts-list/use-tts-list";
import { TtsItem } from "@/app/components/app-editor/editor-card/tts-list/tts-item/tts-item";
import { TtsComposer } from "@/app/components/app-editor/editor-card/tts-list/tts-composer/tts-composer";

export function TtsList() {
  const {
    fields,
    initialVoiceId,
    pageId,
    removeTts,
    insertTtsAfter,
    appendTts,
    handleDragEnd,
    selectTtsOnFocus,
    selectTts,
  } = useTtsList();

  return (
    <FieldGroup className="min-h-10 flex-1 gap-0">
      {fields.length === 0 ? null : (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div className="grid gap-5 pb-10">
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
      <TtsComposer initialVoiceId={initialVoiceId} pageId={pageId} onAppend={appendTts} />
    </FieldGroup>
  );
}
