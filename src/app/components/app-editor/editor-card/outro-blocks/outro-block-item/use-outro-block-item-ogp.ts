import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { ogpMetadataKeys } from "@/_schemas";
import { fetchOgp } from "@/app/features/ogp";

export function useOutroBlockItemOgp(index: number) {
  const form = useFormContext<PageFormValues>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAndApplyOgp = async () => {
    const url = form.getValues(`meta.blocks.${index}.url`);
    if (!url?.trim()) {
      setError("URL is required");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const ogp = await fetchOgp(url.trim());
      for (const key of ogpMetadataKeys) {
        form.setValue(`meta.blocks.${index}.${key}`, ogp[key], {
          shouldDirty: true,
        });
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch OGP");
    } finally {
      setPending(false);
    }
  };

  return {
    pending,
    error,
    fetchAndApplyOgp,
  };
}
