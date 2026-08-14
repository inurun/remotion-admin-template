import { useCallback, useState } from "react";
import { useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { DraftProject } from "@/_schemas";
import { useEditor } from "@/app/features/editor";
import { fetchBgmFiles } from "@/app/features/bgm";

const bgmTrackFormSchema = z.object({
  src: z.string(),
  startSec: z.string(),
  endSec: z.string(),
  fadeIn: z.boolean(),
  fadeOut: z.boolean(),
  volume: z.number().min(0).max(1),
});

const bgmFormSchema = z.object({
  tracks: z.array(bgmTrackFormSchema),
});

type BgmFormValues = z.infer<typeof bgmFormSchema>;

function secToString(sec: number | null): string {
  return sec === null ? "" : String(sec);
}

function stringToSec(str: string): number | null {
  const trimmed = str.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function toFormValues(bgm: DraftProject["bgm"]): BgmFormValues {
  return {
    tracks: bgm.map((track) => ({
      src: track.src,
      startSec: secToString(track.startSec),
      endSec: secToString(track.endSec),
      fadeIn: track.fadeIn,
      fadeOut: track.fadeOut,
      volume: track.volume,
    })),
  };
}

function fromFormValues(values: BgmFormValues): DraftProject["bgm"] {
  return values.tracks.map((track) => ({
    src: track.src,
    startSec: stringToSec(track.startSec),
    endSec: stringToSec(track.endSec),
    fadeIn: track.fadeIn,
    fadeOut: track.fadeOut,
    volume: track.volume,
  }));
}

export function useBgmDialog() {
  const { control, setValue } = useFormContext<DraftProject>();
  const { isPending, save } = useEditor();
  const bgm = useWatch({ control, name: "bgm" });
  const [open, setOpen] = useState(false);
  const [musicFiles, setMusicFiles] = useState<string[]>([]);

  const form = useForm<BgmFormValues>({
    resolver: zodResolver(bgmFormSchema),
    defaultValues: { tracks: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tracks",
  });

  const handleOpenChange = useCallback(
    async (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        form.reset(toFormValues(bgm));
        try {
          const files = await fetchBgmFiles();
          setMusicFiles(files);
        } catch {
          setMusicFiles([]);
        }
      }
    },
    [form, bgm],
  );

  const addTrack = useCallback(() => {
    append({
      src: musicFiles[0] ?? "",
      startSec: "",
      endSec: "",
      fadeIn: false,
      fadeOut: false,
      volume: 1,
    });
  }, [append, musicFiles]);

  const submit = form.handleSubmit(async (values) => {
    setValue("bgm", fromFormValues(values), { shouldDirty: true, shouldValidate: true });
    await save();
    setOpen(false);
  });

  return {
    form,
    fields,
    remove,
    addTrack,
    open,
    handleOpenChange,
    isPending,
    musicFiles,
    submit,
  };
}
