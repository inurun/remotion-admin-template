/**
 * Serialises remounts: bursts collapse into one mount of the newest data, and data
 * identical to what will be on screen once the queue drains is skipped (the admin
 * re-sends the embedded data right after load).
 */
export function createMountQueue<T>(mount: (data: T) => Promise<void>) {
  let mountedKey: string | null = null;
  let inflightKey: string | null = null;
  let latest: { data: T; key: string } | null = null;
  let running: Promise<void> | null = null;

  const drain = async () => {
    let error: unknown = null;
    while (latest) {
      const { data, key } = latest;
      latest = null;
      inflightKey = key;
      try {
        await mount(data);
        mountedKey = key;
        error = null;
      } catch (caught) {
        error = caught;
      } finally {
        inflightKey = null;
      }
    }
    running = null;
    if (error) {
      throw error;
    }
  };

  return {
    schedule: (data: T): Promise<void> => {
      const key = JSON.stringify(data);
      if (key === (latest?.key ?? inflightKey ?? mountedKey)) {
        return running ?? Promise.resolve();
      }
      if (key === inflightKey) {
        // Back to what is being mounted: drop the queued change.
        latest = null;
        return running ?? Promise.resolve();
      }
      latest = { data, key };
      running ??= drain();
      return running;
    },
    isIdle: () => running === null,
  };
}
