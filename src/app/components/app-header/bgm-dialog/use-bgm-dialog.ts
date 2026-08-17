import { useCallback, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { BgmTrack } from "@/_schemas";
import { useEditor, useEditorSession } from "@/app/features/editor";
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

function toFormValues(bgm: BgmTrack[]): BgmFormValues {
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

function fromFormValues(values: BgmFormValues): BgmTrack[] {
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
  const projectSettings = useEditorSession((state) => state.project);
  const updateProjectSettings = useEditorSession((state) => state.updateProjectSettings);
  const { isPending, save } = useEditor();
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
        form.reset(toFormValues(projectSettings.bgm));
        try {
          const files = await fetchBgmFiles();
          setMusicFiles(files);
        } catch {
          setMusicFiles([]);
        }
      }
    },
    [form, projectSettings.bgm],
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
    updateProjectSettings({
      ...projectSettings,
      bgm: fromFormValues(values),
    });
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
