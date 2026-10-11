import { describe, expect, it } from "vitest";
import { fetchAllRows } from "./fetchAllRows";

describe("complete Data API reads", () => {
  it("reads more than 1000 rows without skipping rows under a smaller server limit", async () => {
    const source = Array.from({ length: 1203 }, (_, id) => ({ id }));
    const rows = await fetchAllRows(async (from, to) => ({
      data: source.slice(from, Math.min(to + 1, from + 100)), error: null,
    }));
    expect(rows).toEqual(source);
  });
  it("fails rather than returning a partial financial total", async () => {
    await expect(fetchAllRows(async from => from === 0
      ? { data: [{ id: 1 }], error: null }
      : { data: null, error: new Error("page failed") },
    )).rejects.toThrow("page failed");
  });
});
