export const LOCAL_INDEX_PREFIX='.baraq-text-index-';
const controlPrefix='.baraq-index-retention-';
const indexName=/^\.baraq-text-index-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/i;
interface RetentionEvent {format:'baraq-index-retention';version:1;revision:number;action:'retire'|'restore';names:string[]}
export async function withLocalIndexLock<T>(signal:AbortSignal,action:()=>Promise<T>):Promise<T>{
 signal.throwIfAborted();if(!navigator.locks)throw new Error('المتصفح لا يدعم قفل الفهرس؛ استخدم Chrome أو Edge حديثاً.');
 return navigator.locks.request('baraq-local-text-index-write',{signal},async()=>{signal.throwIfAborted();return action();});
}
export async function localIndexFiles(root:FileSystemDirectoryHandle,signal:AbortSignal){
 const indexes:FileSystemHandle[]=[],controls:FileSystemHandle[]=[];let scanned=0;
 for await(const entry of(root as unknown as {values():AsyncIterable<FileSystemHandle>}).values()){
  signal.throwIfAborted();if(++scanned>10000)throw new Error('المجلد كبير جداً لفحص الفهرس كاملاً.');if(entry.kind!=='file')continue;
  if(entry.name.startsWith(LOCAL_INDEX_PREFIX)){indexes.push(entry);if(indexes.length>1000)throw new Error('تجاوز الفهرس 1000 ملف تاريخي؛ اختر وجهة فهرس جديدة قبل المتابعة.');}
  if(entry.name.startsWith(controlPrefix)){controls.push(entry);if(controls.length>100)throw new Error('تجاوز سجل تنظيم الفهرس 100 عملية؛ يلزم تنظيم مساحة الفهرس قبل المتابعة.');}
 }
 const events:{name:string;event:RetentionEvent}[]=[];let incomplete=0;
 for(const entry of controls){
  signal.throwIfAborted();const file=await(await root.getFileHandle(entry.name)).getFile();if(file.size===0){incomplete++;continue;}if(file.size>65536)throw new Error('سجل تنظيم الفهرس غير صالح؛ لم تُخفَ نتائج بصمت.');let value:unknown;try{value=JSON.parse(await file.text());}catch{throw new Error('سجل تنظيم الفهرس تالف؛ لم تُخفَ نتائج بصمت.');}const e=value as RetentionEvent;
  if(!e||e.format!=='baraq-index-retention'||e.version!==1||!Number.isSafeInteger(e.revision)||e.revision<1||!['retire','restore'].includes(e.action)||!Array.isArray(e.names)||!e.names.length||e.names.length>200||e.names.some(name=>typeof name!=='string'||!indexName.test(name))||new Set(e.names).size!==e.names.length)throw new Error('سجل تنظيم الفهرس غير صالح؛ لم تُخفَ نتائج بصمت.');events.push({name:entry.name,event:e});
 }
 events.sort((a,b)=>a.event.revision-b.event.revision||a.name.localeCompare(b.name));const retired=new Set<string>();for(const {event}of events)for(const name of event.names)if(event.action==='retire')retired.add(name);else retired.delete(name);
 return {active:indexes.filter(entry=>!retired.has(entry.name)),retired:indexes.filter(entry=>retired.has(entry.name)),revision:events.at(-1)?.event.revision??0,controlCount:controls.length,total:indexes.length,incomplete};
}
export function retentionEventName(){return controlPrefix+crypto.randomUUID()+'.json';}
export function retentionEvent(revision:number,action:'retire'|'restore',names:string[]):RetentionEvent{
 if(!Number.isSafeInteger(revision)||revision<1||!['retire','restore'].includes(action)||!names.length||names.length>200||new Set(names).size!==names.length||names.some(name=>!indexName.test(name)))throw new Error('قائمة نسخ الفهرس غير صالحة.');return {format:'baraq-index-retention',version:1,revision,action,names};
}
export function canRetireIndex(name:string){return indexName.test(name);}
export function isLocalIndexInternalName(name:string){return indexName.test(name)||/^\.baraq-index-retention-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/i.test(name);}
