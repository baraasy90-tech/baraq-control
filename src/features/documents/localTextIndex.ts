import {contentFileKind,decodeDocumentText,MAX_CONTENT_BYTES,MAX_CONTENT_CHARACTERS} from './contentText';
import {finishCrc32,updateCrc32} from './archiveExportPlan';
import {localFolder,validateLocalSegment,writeNewLocalFile} from './localArchiveStore';
const prefix='.baraq-text-index-';
const maxIndexes=200,maxScanned=10000;
interface LocalTextRecord {format:'baraq-local-text';version:1;path:string[];name:string;bytes:number;modified:number;crc32:string;text:string;indexedAt:string}
export interface LocalTextHit {path:string[];name:string;snippet:string}
async function fingerprint(file:File,signal:AbortSignal){
 signal.throwIfAborted();if(file.size>MAX_CONTENT_BYTES)throw new Error('الفهرسة تدعم ملفات حتى 10 ميجابايت؛ لا يؤثر ذلك على حجم التخزين.');
 const bytes=new Uint8Array(await file.arrayBuffer());signal.throwIfAborted();return {bytes,crc32:finishCrc32(updateCrc32(0xffffffff,bytes))};
}
export async function indexLocalText(root:FileSystemDirectoryHandle,path:string[],name:string,signal:AbortSignal){
 if(path.length>32||name.startsWith(prefix)||path.some(segment=>segment.startsWith('.baraq-')))throw new Error('مسار غير مناسب للفهرسة.');validateLocalSegment(name);
 let scanned=0,indexes=0;for await(const entry of (root as unknown as {values():AsyncIterable<FileSystemHandle>}).values()){signal.throwIfAborted();if(++scanned>maxScanned)throw new Error('المجلد كبير جداً لفحص الفهرس كاملاً.');if(entry.kind==='file'&&entry.name.startsWith(prefix)&&++indexes>=maxIndexes)throw new Error('وصل الفهرس إلى حد 200 نسخة؛ لم تُضف نسخة جديدة.');}
 const kind=contentFileKind(name);if(!kind)throw new Error('الفهرسة تدعم PDF النصي وTXT وCSV وTSV وMD وJSON وXML وXER وLOG.');
 const handle=await(await localFolder(root,path)).getFileHandle(name),before=await handle.getFile(),source=await fingerprint(before,signal);
 const timed=AbortSignal.any([signal,AbortSignal.timeout(60000)]);
 const text=kind==='text'?decodeDocumentText(source.bytes):await(await import('./extractPdfText')).extractPdfText(source.bytes.slice(),timed);
 timed.throwIfAborted();const after=await handle.getFile(),current=await fingerprint(after,timed);
 if(after.lastModified!==before.lastModified||after.size!==before.size||current.crc32!==source.crc32)throw new Error('تغير الملف أثناء الفهرسة؛ أعد المحاولة.');
 const record:LocalTextRecord={format:'baraq-local-text',version:1,path:[...path],name,bytes:before.size,modified:before.lastModified,crc32:source.crc32,text,indexedAt:new Date().toISOString()};
 await writeNewLocalFile(root,[],new File([JSON.stringify(record)],prefix+crypto.randomUUID()+'.json',{type:'application/json'}),timed);
}
function parseRecord(value:unknown):LocalTextRecord|null{
 if(!value||typeof value!=='object')return null;const r=value as LocalTextRecord;
 if(r.format!=='baraq-local-text'||r.version!==1||!Array.isArray(r.path)||r.path.length>32||r.path.some(p=>typeof p!=='string')||typeof r.name!=='string'||!contentFileKind(r.name)||!Number.isSafeInteger(r.bytes)||r.bytes<0||r.bytes>MAX_CONTENT_BYTES||!Number.isFinite(r.modified)||typeof r.crc32!=='string'||!/^[0-9a-f]{8}$/.test(r.crc32)||typeof r.text!=='string'||r.text.length>MAX_CONTENT_CHARACTERS||typeof r.indexedAt!=='string'||!Number.isFinite(Date.parse(r.indexedAt)))return null;
 try{validateLocalSegment(r.name);r.path.forEach(validateLocalSegment);}catch{return null;}return r;
}
export async function searchLocalText(root:FileSystemDirectoryHandle,query:string,signal:AbortSignal):Promise<{hits:LocalTextHit[];stale:number}>{
 const needle=query.trim().toLocaleLowerCase();if(needle.length<2||needle.length>200)throw new Error('اكتب بين حرفين و200 حرف للبحث.');
 const records=new Map<string,LocalTextRecord>();let scanned=0,indexes=0;
 for await(const entry of (root as unknown as {values():AsyncIterable<FileSystemHandle>}).values()){
  signal.throwIfAborted();if(++scanned>maxScanned)throw new Error('المجلد كبير جداً لفحص الفهرس كاملاً.');
  if(entry.kind!=='file'||!entry.name.startsWith(prefix)||!entry.name.endsWith('.json'))continue;
  if(++indexes>maxIndexes)throw new Error('تجاوز الفهرس 200 نسخة؛ يلزم تنظيمه قبل البحث الكامل.');
  const file=await(await root.getFileHandle(entry.name)).getFile();if(file.size>MAX_CONTENT_CHARACTERS*6+8192)continue;
  let value:unknown;try{value=JSON.parse(await file.text());}catch{continue;}const record=parseRecord(value);if(!record)continue;
  const key=JSON.stringify([...record.path,record.name]),prior=records.get(key);if(!prior||Date.parse(record.indexedAt)>Date.parse(prior.indexedAt))records.set(key,record);
 }
 const hits:LocalTextHit[]=[];let stale=0;
 for(const record of records.values()){
  signal.throwIfAborted();const position=record.text.toLocaleLowerCase().indexOf(needle);if(position<0)continue;
  try{
   const handle=await(await localFolder(root,record.path)).getFileHandle(record.name),file=await handle.getFile();
   if(file.size!==record.bytes||file.lastModified!==record.modified){stale++;continue;}
   const digest=await fingerprint(file,signal),after=await handle.getFile();
   if(digest.crc32!==record.crc32||after.size!==file.size||after.lastModified!==file.lastModified){stale++;continue;}
   hits.push({path:record.path,name:record.name,snippet:record.text.slice(Math.max(0,position-60),position+160)});
  }catch(error){if(error instanceof DOMException&&error.name==='NotFoundError'){stale++;continue;}throw error;}
 }
 return {hits,stale};
}
