import { RefreshCw } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { DialogClose, DialogFooter } from "@/_shared/components/ui/dialog";

export function WeatherFetchButton({
  disabled,
  isFetching,
  onFetch,
}: {
  disabled: boolean;
  isFetching: boolean;
  onFetch: () => Promise<void>;
}) {
  return (
    <Button type="button" variant="outline" disabled={disabled} onClick={() => void onFetch()}>
      <RefreshCw className={isFetching ? "animate-spin" : undefined} />
      {isFetching ? "Fetching" : "Fetch tomorrow"}
    </Button>
  );
}

export function WeatherDialogFooter({
  disabled,
  isPending,
}: {
  disabled: boolean;
  isPending: boolean;
}) {
  return (
    <DialogFooter>
      <DialogClose render={<Button type="button" variant="outline" disabled={disabled} />}>
        Cancel
      </DialogClose>
      <Button type="submit" disabled={disabled}>
        {isPending ? "Saving" : "Save"}
      </Button>
    </DialogFooter>
  );
}
