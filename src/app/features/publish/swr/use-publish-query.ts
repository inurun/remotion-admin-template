import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  fetchPublishState,
  PUBLISH_STREAM_URL,
  publishKeys,
  type PublishState,
} from "@/app/features/publish/api/publish-api";

const initialPublishState: PublishState = {
  status: "idle",
  logs: [],
  resultUrl: null,
  lastError: null,
  jobId: null,
};

export function usePublishStateQuery() {
  const { data, mutate } = useSWR(publishKeys.snapshot(), fetchPublishState, {
    revalidateOnFocus: false,
  });
  const [publishState, setPublishState] = useState<PublishState>(initialPublishState);

  useEffect(() => {
    if (data) {
      setPublishState(data);
    }
  }, [data]);

  useEffect(() => {
    const eventSource = new EventSource(PUBLISH_STREAM_URL);
    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data) as PublishState;
      setPublishState(payload);
      void mutate(payload, { revalidate: false });
    };

    return () => {
      eventSource.close();
    };
  }, [mutate]);

  return {
    publishState,
    reloadPublishState: async () => {
      await mutate();
    },
  };
}
