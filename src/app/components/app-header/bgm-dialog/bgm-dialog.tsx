import { Music2, Plus, Trash2 } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button } from "@/_shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogMain,
  DialogTitle,
  DialogTrigger,
} from "@/_shared/components/ui/dialog";
import { Input } from "@/_shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_shared/components/ui/select";
import { Slider } from "@/_shared/components/ui/slider";
import { useBgmDialog } from "./use-bgm-dialog";

export function BgmDialog() {
  const dialog = useBgmDialog();

  return (
    <Dialog open={dialog.open} onOpenChange={(o) => void dialog.handleOpenChange(o)}>
      <DialogTrigger
        render={<Button type="button" size="icon-sm" variant="ghost" title="BGM settings" />}
      >
        <Music2 />
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[min(92vw,560px)]">
        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={(e) => void dialog.submit(e)}
        >
          <DialogHeader>
            <DialogTitle>BGM</DialogTitle>
          </DialogHeader>

          <DialogMain className="grid gap-3">
            {dialog.fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No BGM tracks</p>
            )}
            {dialog.fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Controller
                    control={dialog.form.control}
                    name={`tracks.${index}.src`}
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange}>
                        <SelectTrigger className="flex-1 min-w-0">
                          <SelectValue placeholder="Select music file" />
                        </SelectTrigger>
                        <SelectContent>
                          {dialog.musicFiles.map((file) => (
                            <SelectItem key={file} value={file}>
                              {file}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    onClick={() => dialog.remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <div className="grid grid-cols-[1fr_1fr] gap-2">
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Start (sec)
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="0 (default)"
                      {...dialog.form.register(`tracks.${index}.startSec`)}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    End (sec)
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="∞ (loop)"
                      {...dialog.form.register(`tracks.${index}.endSec`)}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-4">
                  <Controller
                    control={dialog.form.control}
                    name={`tracks.${index}.volume`}
                    render={({ field: f }) => (
                      <div className="flex flex-1 items-center gap-2">
                        <span className="text-xs text-muted-foreground w-13 shrink-0">
                          Vol {String(Math.round(f.value * 100)).padStart(3, "0")}%
                        </span>
                        <Slider
                          min={0}
                          max={100}
                          value={[Math.round(f.value * 100)]}
                          onValueChange={(vals) => {
                            const v = Array.isArray(vals) ? vals[0] : vals;
                            if (typeof v === "number") f.onChange(v / 100);
                          }}
                        />
                      </div>
                    )}
                  />
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" {...dialog.form.register(`tracks.${index}.fadeIn`)} />
                      Fade in
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" {...dialog.form.register(`tracks.${index}.fadeOut`)} />
                      Fade out
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={dialog.addTrack}
            >
              <Plus />
              Add track
            </Button>
          </DialogMain>

          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="outline" disabled={dialog.isPending} />}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={dialog.isPending}>
              {dialog.isPending ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
