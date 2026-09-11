const queues = new Map<string, Promise<unknown>>();

export function enqueueProjectMutation<T>(projectPath: string, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(projectPath) ?? Promise.resolve();
  const next = previous.then(task, task);
  queues.set(projectPath, next);
  return next;
}

export function resetProjectMutationQueueForTests() {
  queues.clear();
}
