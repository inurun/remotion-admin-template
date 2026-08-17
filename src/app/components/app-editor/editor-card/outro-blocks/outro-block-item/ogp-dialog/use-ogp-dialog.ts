import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useCallback, useState } from "react";
import { useFormContext } from "react-hook-form";
import { ogpMetadataKeys } from "@/_schemas";
import { fetchOgp } from "@/app/features/ogp";

export function useOgpDialog(index: number) {
  const form = useFormContext<PageFormValues>();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        return;
      }

      setUrl(form.getValues(`meta.blocks.${index}.url`) ?? "");
      setError(null);
      setPending(false);
    },
    [form, index],
  );

  const fetchAndApplyOgp = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("URL is required");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const ogp = await fetchOgp(trimmed);
      for (const key of ogpMetadataKeys) {
        form.setValue(`meta.blocks.${index}.${key}`, ogp[key], {
          shouldDirty: true,
        });
      }
      setOpen(false);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch OGP");
    } finally {
      setPending(false);
    }
  };

  return {
    open,
    url,
    pending,
    error,
    setUrl,
    handleOpenChange,
    fetchAndApplyOgp,
  };
}
