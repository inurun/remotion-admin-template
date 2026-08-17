import { Field, FieldError } from "@/_shared/components/ui/field";
import { Textarea } from "@/_shared/components/ui/textarea";
import { useTtsTextField } from "@/app/components/app-editor/editor-card/tts-list/tts-item/tts-text-field/use-tts-text-field";

export function TtsTextField({
  index,
  ttsId,
  onFocus,
  onInsertAfter,
  onRemove,
}: {
  index: number;
  ttsId: string;
  onFocus: (index: number) => void;
  onInsertAfter: (index: number) => void;
  onRemove: () => void;
}) {
  const { fieldName, fieldState, text, textAreaRef, handleKeyDown, changeText, focusField } =
    useTtsTextField({
      index,
      ttsId,
      onFocus,
      onInsertAfter,
      onRemove,
    });

  return (
    <Field data-invalid={fieldState.invalid} className="flex-1 min-w-50">
      <Textarea
        ref={textAreaRef}
        name={fieldName}
        value={text}
        aria-invalid={fieldState.invalid}
        placeholder="Text"
        onChange={(event) => changeText(event.target.value)}
        onFocus={focusField}
        onKeyDown={handleKeyDown}
        className="w-full"
      />
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}
