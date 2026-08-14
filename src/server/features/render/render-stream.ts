import { sseMessage } from "@/server/_shared/http";
import { readRenderSnapshot, type RenderSnapshot, subscribeRender } from "./render-state";
import { renderSnapshotSchema } from "./contract";

function createKeepAliveMessage(encoder: TextEncoder) {
  return encoder.encode(": keep-alive\n\n");
}

function toSnapshotMessage(encoder: TextEncoder, snapshot: RenderSnapshot) {
  return encoder.encode(sseMessage(renderSnapshotSchema.parse(snapshot)));
}

function pushSnapshot(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  lastUpdatedAtRef: { value: number },
  closedRef: { value: boolean },
  snapshot: RenderSnapshot,
) {
  if (closedRef.value || snapshot.updatedAt === lastUpdatedAtRef.value) {
    return;
  }

  lastUpdatedAtRef.value = snapshot.updatedAt;
  controller.enqueue(toSnapshotMessage(encoder, snapshot));
}

export function createRenderStream(signal: AbortSignal) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const closedRef = { value: false };
      const lastUpdatedAtRef = { value: -1 };
      const enqueueSnapshot = (snapshot: RenderSnapshot) => {
        pushSnapshot(controller, encoder, lastUpdatedAtRef, closedRef, snapshot);
      };
      const unsubscribe = subscribeRender(enqueueSnapshot);

      void readRenderSnapshot().then(enqueueSnapshot);

      const polling = setInterval(() => {
        void readRenderSnapshot().then(enqueueSnapshot);
      }, 500);

      const heartbeat = setInterval(() => {
        if (!closedRef.value) {
          controller.enqueue(createKeepAliveMessage(encoder));
        }
      }, 15_000);

      const close = () => {
        if (closedRef.value) {
          return;
        }

        closedRef.value = true;
        clearInterval(polling);
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      };

      signal.addEventListener("abort", close, { once: true });
    },
  });
}
