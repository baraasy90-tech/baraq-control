import {expect,it} from 'vitest';
import {searchLocalNames} from './localNameSearch';
function folder(entries:{name:string;kind:'file'|'directory';folder?:FileSystemDirectoryHandle}[]):FileSystemDirectoryHandle{return {async *values(){yield* entries;},getDirectoryHandle:async(name:string)=>{const child=entries.find(entry=>entry.name===name)?.folder;if(!child)throw new Error('No permission');return child;}} as unknown as FileSystemDirectoryHandle;}
it('finds nested names without reading bytes and skips application recovery/index folders',async()=>{
 const child=folder([{name:'DRAWING.dwg',kind:'file'}]);const root=folder([{name:'Plans',kind:'directory',folder:child},{name:'.baraq-recovery-test',kind:'directory',folder:child}]);
 const result=await searchLocalNames(root,'drawing',new AbortController().signal);
 expect(result.complete).toBe(true);expect(result.hits).toEqual([{name:'DRAWING.dwg',kind:'file',path:['Plans']}]);
});
it('preserves partial results and does not report an unreadable tree as complete',async()=>{
 const root=folder([{name:'found.txt',kind:'file'},{name:'Locked',kind:'directory'}]);
 const result=await searchLocalNames(root,'found',new AbortController().signal);expect(result.hits).toHaveLength(1);expect(result).toMatchObject({complete:false,reason:'unreadable'});
});
it('bounds results and entries rather than silently dropping excess matches',async()=>{
 const many=folder(Array.from({length:5010},(_,i)=>({name:`file-${i}.txt`,kind:'file' as const})));
 expect(await searchLocalNames(many,'file',new AbortController().signal)).toMatchObject({complete:false,reason:'results'});
 expect(await searchLocalNames(many,'missing',new AbortController().signal)).toMatchObject({complete:false,reason:'entries',scanned:5000});
});
it('allows cancellation before traversing and validates the query',async()=>{
 const controller=new AbortController();controller.abort();expect(await searchLocalNames(folder([]),'test',controller.signal)).toMatchObject({complete:false,reason:'stopped',scanned:0});
 await expect(searchLocalNames(folder([]),'a',new AbortController().signal)).rejects.toThrow();
});
it('keeps matches when cancelled mid-search and marks unvisited deep folders as partial',async()=>{
 const controller=new AbortController();
 const result=await searchLocalNames(folder(Array.from({length:150},(_,i)=>({name:`file-${i}.txt`,kind:'file' as const}))),'file-0',controller.signal,()=>controller.abort());
 expect(result).toMatchObject({complete:false,reason:'stopped',scanned:100});expect(result.hits).toHaveLength(1);
 let deep=folder([{name:'target.txt',kind:'file'}]);for(let i=0;i<35;i++)deep=folder([{name:`level-${i}`,kind:'directory',folder:deep}]);
 expect(await searchLocalNames(deep,'target',new AbortController().signal)).toMatchObject({complete:false,reason:'depth'});
});
