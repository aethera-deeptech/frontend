// The first item of a list. A test fails with a clear message when the list is empty, which is shorter than a check
// in every test and keeps the type free of undefined.
export function first<T>(items: readonly T[]): T {
  const item = items[0];

  if (item === undefined) {
    throw new Error('The list is empty.');
  }

  return item;
}
