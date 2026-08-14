import { Controller, type Control, type UseFormReturn } from "react-hook-form";
import { Button } from "@/_shared/components/ui/button";
import { FieldError } from "@/_shared/components/ui/field";
import { Input } from "@/_shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_shared/components/ui/select";
import { WEATHER_LOCATIONS } from "@/features/weather";
import type { WeatherFormValues } from "./weather-dialog.lib";

const WEATHER_CONDITIONS = ["clear", "cloudy", "rain", "storm", "snow"] as const;

type WeatherLocation = (typeof WEATHER_LOCATIONS)[number];

function WeatherLocationToggle({
  enabled,
  index,
  onToggle,
}: {
  enabled: boolean;
  index: number;
  onToggle: (index: number) => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={enabled ? "secondary" : "outline"}
      onClick={() => onToggle(index)}
    >
      {enabled ? "Included" : "Excluded"}
    </Button>
  );
}

function WeatherConditionField({
  control,
  enabled,
  index,
}: {
  control: Control<WeatherFormValues>;
  enabled: boolean;
  index: number;
}) {
  return (
    <Controller
      control={control}
      name={`entries.${index}.condition`}
      render={({ field }) => (
        <Select value={field.value} disabled={!enabled} onValueChange={field.onChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEATHER_CONDITIONS.map((condition) => (
              <SelectItem key={condition} value={condition}>
                {condition}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

export function WeatherForecastRow({
  enabled,
  form,
  index,
  location,
  onToggle,
}: {
  enabled: boolean;
  form: UseFormReturn<WeatherFormValues>;
  index: number;
  location: WeatherLocation;
  onToggle: (index: number) => void;
}) {
  const temperatureError = form.formState.errors.entries?.[index]?.temperatureC;
  const precipitationError = form.formState.errors.entries?.[index]?.precipitationProbability;

  return (
    <div className="grid gap-2 rounded-lg border border-border p-2 sm:grid-cols-[100px_1fr_1fr_1fr_auto] sm:items-start">
      <span className="pt-1 text-sm font-medium">{location.label}</span>
      <div className="grid gap-1">
        <Input
          type="number"
          step="any"
          placeholder="℃"
          disabled={!enabled}
          aria-invalid={Boolean(temperatureError)}
          {...form.register(`entries.${index}.temperatureC`)}
        />
        <FieldError errors={[temperatureError]} />
      </div>
      <div className="grid gap-1">
        <Input
          type="number"
          step="1"
          min="0"
          max="100"
          placeholder="%"
          disabled={!enabled}
          aria-invalid={Boolean(precipitationError)}
          {...form.register(`entries.${index}.precipitationProbability`)}
        />
        <FieldError errors={[precipitationError]} />
      </div>
      <WeatherConditionField control={form.control} enabled={enabled} index={index} />
      <WeatherLocationToggle enabled={enabled} index={index} onToggle={onToggle} />
    </div>
  );
}
