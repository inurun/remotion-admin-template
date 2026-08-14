import { Controller } from "react-hook-form";
import { Field, FieldError } from "@/_shared/components/ui/field";
import { Input } from "@/_shared/components/ui/input";
import { useReadTextField } from "@/app/components/app-editor/config-card/read-text-field/use-read-text-field";

export function ReadTextField() {
  const { control, name } = useReadTextField();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <Input
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
            placeholder="Read"
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
