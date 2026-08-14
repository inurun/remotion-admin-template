import { CloudSun } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/_shared/components/ui/dialog";
import { WEATHER_LOCATIONS } from "@/features/weather";
import { useWeatherDialog } from "./use-weather-dialog";
import { WeatherDialogFooter, WeatherFetchButton } from "./weather-dialog-actions";
import { WeatherForecastRow } from "./weather-forecast-row";

export function WeatherDialog() {
  const dialog = useWeatherDialog();
  const disabled = dialog.isFetching || dialog.isPending;

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.handleOpenChange}>
      <DialogTrigger
        render={<Button type="button" size="icon-sm" variant="ghost" title="Weather" />}
      >
        <CloudSun />
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[min(94vw,840px)] overflow-y-auto">
        <form className="grid gap-4" onSubmit={(event) => void dialog.submit(event)}>
          <DialogHeader>
            <DialogTitle>Tomorrow&apos;s Weather</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end">
            <WeatherFetchButton
              disabled={disabled}
              isFetching={dialog.isFetching}
              onFetch={dialog.fetchForecasts}
            />
          </div>
          <div className="grid gap-2">
            <div className="hidden grid-cols-[100px_1fr_1fr_1fr_auto] gap-2 px-2 text-xs text-muted-foreground sm:grid">
              <span>Location</span>
              <span>Temperature</span>
              <span>Precipitation</span>
              <span>Condition</span>
              <span>Status</span>
            </div>
            {WEATHER_LOCATIONS.map((location, index) => (
              <WeatherForecastRow
                key={location.id}
                enabled={dialog.entries[index]?.enabled ?? false}
                form={dialog.form}
                index={index}
                location={location}
                onToggle={dialog.toggleLocation}
              />
            ))}
          </div>
          <WeatherDialogFooter disabled={disabled} isPending={dialog.isPending} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
