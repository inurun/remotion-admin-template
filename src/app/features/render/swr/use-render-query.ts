import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  fetchRenderState,
  RENDER_STREAM_URL,
  renderKeys,
  type RenderState,
} from "@/app/features/render/api/render-api";

const initialRenderState: RenderState = {
  status: "idle",
  logs: [],
  videoPath: null,
  lastError: null,
};

export function useRenderStateQuery() {
  const { data, mutate } = useSWR(renderKeys.snapshot(), fetchRenderState, {
    revalidateOnFocus: false,
  });
  const [renderState, setRenderState] = useState<RenderState>(initialRenderState);

  useEffect(() => {
    if (data) {
      setRenderState(data);
    }
  }, [data]);

  useEffect(() => {
    const eventSource = new EventSource(RENDER_STREAM_URL);
    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data) as RenderState;
      setRenderState(payload);
      void mutate(payload, { revalidate: false });
    };

    return () => {
      eventSource.close();
    };
  }, [mutate]);

  return {
    renderState,
    reloadRenderState: async () => {
      await mutate();
    },
  };
}
