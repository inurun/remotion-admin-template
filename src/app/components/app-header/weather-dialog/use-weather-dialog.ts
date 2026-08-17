import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useEditor, useEditorSession } from "@/app/features/editor";
import { fetchTomorrowWeather } from "@/app/features/weather";
import {
  fromWeatherFormValues,
  toWeatherFormValues,
  weatherFormSchema,
  type WeatherFormValues,
} from "./weather-dialog.lib";

export function useWeatherDialog() {
  const projectSettings = useEditorSession((state) => state.project);
  const updateProjectSettings = useEditorSession((state) => state.updateProjectSettings);
  const weather = projectSettings.meta.weather;
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
    updateProjectSettings({
      ...projectSettings,
      meta: {
        ...projectSettings.meta,
        weather: fromWeatherFormValues(values),
      },
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
