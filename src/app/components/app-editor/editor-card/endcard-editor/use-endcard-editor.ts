import { useCallback, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { DraftProject } from "@/_schemas";
import { fetchNicoad } from "@/app/features/nicoad";
import { useSelectedPage } from "@/app/features/page";
import {
  createBlankEndcardAdvertiser,
  createBlankEndcardCredit,
  createBlankEndcardMessage,
} from "@/app/features/page/lib/endcard";
import {
  useEndcardAdvertisers,
  useEndcardCredits,
  useEndcardMessages,
} from "./endcard-list/use-endcard-list";

export function useEndcardEditor() {
  const form = useFormContext<DraftProject>();
  const { selectedPageIndex } = useSelectedPage();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const credits = useEndcardCredits(createBlankEndcardCredit);
  const advertisers = useEndcardAdvertisers(createBlankEndcardAdvertiser);
  const messages = useEndcardMessages(createBlankEndcardMessage);

  const fetchAdvertisers = useCallback(async () => {
    const source = form.getValues(`pages.${selectedPageIndex}.meta.nicoadSource`);
    if (typeof source !== "string" || !source.trim()) {
      setError("Source is required");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const result = await fetchNicoad(source.trim());
      advertisers.replace(result.advertisers.map((item) => createBlankEndcardAdvertiser(item)));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch nicoad");
    } finally {
      setPending(false);
    }
  }, [advertisers, form, selectedPageIndex]);

  return {
    selectedPageIndex,
    pending,
    error,
    credits,
    advertisers,
    messages,
    fetchAdvertisers,
  };
}
