export function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  if (item === undefined) {
    return items;
  }

  next.splice(toIndex, 0, item);
  return next;
}
