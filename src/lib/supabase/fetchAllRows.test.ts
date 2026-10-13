import { describe, expect, it } from "vitest";
import { fetchAllRows, fetchRowsByIds } from "./fetchAllRows";

describe("complete Data API reads", () => {
  it("limits concurrent batches and preserves results when batches finish out of order", async () => {
    const ids=Array.from({length:405},(_,i)=>String(i));let active=0,maximum=0;
    const rows=await fetchRowsByIds(ids,async(batch,from)=>{
      active++;maximum=Math.max(maximum,active);
      await new Promise(resolve=>setTimeout(resolve,batch[0]==='0'?15:1));
      active--;
      return {data:from===0?batch.map(id=>({id})):[],error:null};
    });
    expect(maximum).toBeLessThanOrEqual(3);expect(rows.map(row=>row.id)).toEqual(ids);
  });
  it("bounds IN filters and paginates each batch without repeating duplicate IDs", async () => {
    const ids = Array.from({length:205},(_,i)=>String(i));
    const lengths:number[]=[];
    const rows=await fetchRowsByIds([...ids,ids[0]],async(batch,from,to)=>{
      lengths.push(batch.length);
      return {data:batch.slice(from,Math.min(from+20,to+1)).map(id=>({id})),error:null};
    });
    expect(rows.map(row=>row.id)).toEqual(ids);
    expect(Math.max(...lengths)).toBe(100);
    expect(await fetchRowsByIds([],async()=>{throw new Error("should not query")})).toEqual([]);
  });
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
