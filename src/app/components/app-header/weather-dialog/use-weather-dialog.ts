import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { DraftProject } from "@/_schemas";
import { useEditor } from "@/app/features/editor";
import { fetchTomorrowWeather } from "@/app/features/weather";
import {
  fromWeatherFormValues,
  toWeatherFormValues,
  weatherFormSchema,
  type WeatherFormValues,
} from "./weather-dialog.lib";

export function useWeatherDialog() {
  const { control, setValue } = useFormContext<DraftProject>();
  const weather = useWatch({ control, name: "meta.weather" });
  const { isPending, save } = useEditor();
  const [open, setOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const form = useForm<WeatherFormValues>({
    resolver: zodResolver(weatherFormSchema),
    defaultValues: toWeatherFormValues(weather),
  });
  const entries = useWatch({ control: form.control, name: "entries" });

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        form.reset(toWeatherFormValues(weather));
      }
    },
    [form, weather],
  );

  const fetchForecasts = useCallback(async () => {
    setIsFetching(true);
    try {
      const forecasts = await fetchTomorrowWeather();
      form.reset(toWeatherFormValues(forecasts));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch tomorrow's weather");
    } finally {
      setIsFetching(false);
    }
  }, [form]);

  const toggleLocation = useCallback(
    (index: number) => {
      form.setValue(`entries.${index}.enabled`, !entries[index]?.enabled, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [entries, form],
  );

  const submit = form.handleSubmit(async (values) => {
    setValue("meta.weather", fromWeatherFormValues(values), {
      shouldDirty: true,
      shouldValidate: true,
    });
    await save();
    setOpen(false);
  });

  return {
    entries,
    form,
    isFetching,
    isPending,
    open,
    fetchForecasts,
    handleOpenChange,
    submit,
    toggleLocation,
  };
}
