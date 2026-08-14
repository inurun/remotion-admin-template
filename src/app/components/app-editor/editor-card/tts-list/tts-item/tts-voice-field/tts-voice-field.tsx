import { Field, FieldError } from "@/_shared/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_shared/components/ui/select";
import { getVoiceValue } from "@/app/features/editor";
import { useTtsVoiceField } from "@/app/components/app-editor/editor-card/tts-list/tts-item/tts-voice-field/use-tts-voice-field";

export function TtsVoiceField({
  index,
  onSelect,
}: {
  index: number;
  onSelect: (index: number) => void;
}) {
  const { fieldState, matchedItem, options, selectItems, selectedValue, changeVoice } =
    useTtsVoiceField(index, onSelect);

  return (
    <Field data-invalid={fieldState.invalid}>
      <Select items={selectItems} value={selectedValue} onValueChange={changeVoice}>
        <SelectTrigger tabIndex={-1} aria-invalid={fieldState.invalid}>
          <SelectValue placeholder="Actor">{matchedItem?.label ?? null}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={getVoiceValue(option)} value={getVoiceValue(option)}>
              {option.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}
