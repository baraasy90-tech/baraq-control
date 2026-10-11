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
