import useSWR from "swr";
import { toast } from "sonner";
import { dictionaryKeys, fetchDictionary } from "../api/dictionary-api";

export function useDictionaryQuery() {
  const { data, mutate, isLoading } = useSWR(dictionaryKeys.all(), fetchDictionary, {
    revalidateOnFocus: false,
    onError(error) {
      console.error(error);
      toast.error("Dictionary loading failed");
    },
  });
  return {
    dictionary: data ?? { revision: 0, entries: [] },
    isLoading,
    reload: () => mutate(),
  };
}
