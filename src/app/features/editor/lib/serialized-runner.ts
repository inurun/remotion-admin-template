export function createSerializedRunner() {
  let queue = Promise.resolve();

  return (task: () => Promise<void>) => {
    const run = queue.then(task, task);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}
