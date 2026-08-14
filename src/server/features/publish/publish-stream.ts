import { sseMessage } from "@/server/_shared/http";
import { readPublishSnapshot, type PublishSnapshot, subscribePublish } from "./publish-state";
import { publishSnapshotSchema } from "./contract";

function createKeepAliveMessage(encoder: TextEncoder) {
  return encoder.encode(": keep-alive\n\n");
}

function toSnapshotMessage(encoder: TextEncoder, snapshot: PublishSnapshot) {
  return encoder.encode(sseMessage(publishSnapshotSchema.parse(snapshot)));
}

function pushSnapshot(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  lastUpdatedAtRef: { value: number },
  closedRef: { value: boolean },
  snapshot: PublishSnapshot,
) {
  if (closedRef.value || snapshot.updatedAt === lastUpdatedAtRef.value) {
    return;
  }

  lastUpdatedAtRef.value = snapshot.updatedAt;
  controller.enqueue(toSnapshotMessage(encoder, snapshot));
}

export function createPublishStream(signal: AbortSignal) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const closedRef = { value: false };
      const lastUpdatedAtRef = { value: -1 };
      const enqueueSnapshot = (snapshot: PublishSnapshot) => {
        pushSnapshot(controller, encoder, lastUpdatedAtRef, closedRef, snapshot);
      };
      const unsubscribe = subscribePublish(enqueueSnapshot);

      void readPublishSnapshot().then(enqueueSnapshot);

      const polling = setInterval(() => {
        void readPublishSnapshot().then(enqueueSnapshot);
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
