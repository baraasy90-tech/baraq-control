import {expect,it} from 'vitest';
import {runLocalIndexBatch,type LocalIndexBatchItem} from './localIndexBatch';
it('runs sequentially, keeps per-file failures, and deduplicates names',async()=>{
 let active=0;const seen:string[]=[],reports:LocalIndexBatchItem[][]=[];
 const result=await runLocalIndexBatch(['a.txt','bad.pdf','b.xer','a.txt'],new AbortController().signal,async name=>{expect(active++).toBe(0);seen.push(name);await Promise.resolve();active--;if(name==='bad.pdf')throw new Error('No text');},items=>reports.push(items));
 expect(seen).toEqual(['a.txt','bad.pdf','b.xer']);expect(result.map(item=>item.status)).toEqual(['done','error','done']);expect(result[1].error).toBe('No text');expect(reports[0].every(item=>item.status==='waiting')).toBe(true);
});
it('cancellation preserves completed results and does not start later files',async()=>{
 const controller=new AbortController(),seen:string[]=[];let report:LocalIndexBatchItem[]=[];
 await expect(runLocalIndexBatch(['a.txt','b.txt','c.txt'],controller.signal,async name=>{seen.push(name);if(name==='b.txt'){controller.abort();controller.signal.throwIfAborted();}},items=>{report=items;})).rejects.toThrow();
 expect(seen).toEqual(['a.txt','b.txt']);expect(report.map(item=>item.status)).toEqual(['done','error','waiting']);
});
it('rejects empty, oversized and unsupported batches before any extraction',async()=>{
 let called=false;const run=(names:string[])=>runLocalIndexBatch(names,new AbortController().signal,async()=>{called=true;},()=>{});
 await expect(run([])).rejects.toThrow();await expect(run(['a.dwg'])).rejects.toThrow();await expect(run(Array.from({length:21},(_,i)=>`${i}.txt`))).rejects.toThrow();expect(called).toBe(false);
});
