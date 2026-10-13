/** Explicit pages avoid silently truncating totals at the Data API row limit. */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  const size = 500;
  for (let from = 0; ; ) {
    const result = await page(from, from + size - 1);
    if (result.error) throw result.error;
    if (!result.data) throw new Error("تعذّر قراءة البيانات");
    rows.push(...result.data);
    if (result.data.length === 0) return rows;
    // A project may configure a server limit below the requested page size.
    from += result.data.length;
  }
}

/** Bound IN filters as well as response pages so large companies do not exceed URL limits. */
export async function fetchRowsByIds<T>(
  ids: string[],
  page: (ids: string[], from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const unique = [...new Set(ids)];
  const batches: string[][] = [];
  for (let offset = 0; offset < unique.length; offset += 100) batches.push(unique.slice(offset, offset + 100));
  const results: T[][] = new Array(batches.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(3, batches.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= batches.length) return;
      results[index] = await fetchAllRows((from, to) => page(batches[index], from, to));
    }
  }));
  return results.flat();
}
