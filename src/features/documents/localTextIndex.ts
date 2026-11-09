import {localIndexFiles,withLocalIndexLock,retentionEventName,retentionEvent,canRetireIndex} from './localIndexRetention';
import {ocrImageName} from './ocrImagePolicy';
import {contentFileKind,decodeDocumentText,MAX_CONTENT_BYTES,MAX_CONTENT_CHARACTERS} from './contentText';
import {finishCrc32,updateCrc32} from './archiveExportPlan';
import {localFolder,validateLocalSegment,writeNewLocalFile} from './localArchiveStore';
const prefix='.baraq-text-index-';
const maxIndexes=200;
interface LocalTextRecord {format:'baraq-local-text';version:1;path:string[];name:string;bytes:number;modified:number;crc32:string;text:string;indexedAt:string;source?:'image-ocr-reviewed'|'pdf-ocr-reviewed';confidence?:number;pages?:number[]}
export interface LocalTextHit {path:string[];name:string;snippet:string;pages?:number[]}
async function fingerprint(file:File,signal:AbortSignal){
 signal.throwIfAborted();if(file.size>MAX_CONTENT_BYTES)throw new Error('الفهرسة تدعم ملفات حتى 10 ميجابايت؛ لا يؤثر ذلك على حجم التخزين.');
 const bytes=new Uint8Array(await file.arrayBuffer());signal.throwIfAborted();return {bytes,crc32:finishCrc32(updateCrc32(0xffffffff,bytes))};
}
async function ensureIndexCapacity(root:FileSystemDirectoryHandle,signal:AbortSignal){
 const files=await localIndexFiles(root,signal);if(files.active.length>=maxIndexes)throw new Error('وصل الفهرس إلى حد 200 نسخة نشطة؛ راجع تنظيم الفهرس المحلي.');if(files.total>=1000)throw new Error('وصل الفهرس إلى حد 1000 ملف تاريخي؛ لم تُضف نسخة جديدة.');
}
async function persistIndex(root:FileSystemDirectoryHandle,record:LocalTextRecord,signal:AbortSignal){
 await withLocalIndexLock(signal,async()=>{await ensureIndexCapacity(root,signal);await writeNewLocalFile(root,[],new File([JSON.stringify(record)],prefix+crypto.randomUUID()+'.json',{type:'application/json'}),signal);});
}
export async function indexLocalText(root:FileSystemDirectoryHandle,path:string[],name:string,signal:AbortSignal){
 if(path.length>32||name.startsWith(prefix)||path.some(segment=>segment.startsWith('.baraq-')))throw new Error('مسار غير مناسب للفهرسة.');validateLocalSegment(name);
 await ensureIndexCapacity(root,signal);
 const kind=contentFileKind(name);if(!kind)throw new Error('الفهرسة تدعم PDF النصي وTXT وCSV وTSV وMD وJSON وXML وXER وLOG.');
 const handle=await(await localFolder(root,path)).getFileHandle(name),before=await handle.getFile(),source=await fingerprint(before,signal);
 const timed=AbortSignal.any([signal,AbortSignal.timeout(60000)]);
 const text=kind==='text'?decodeDocumentText(source.bytes):await(await import('./extractPdfText')).extractPdfText(source.bytes.slice(),timed);
 timed.throwIfAborted();const after=await handle.getFile(),current=await fingerprint(after,timed);
 if(after.lastModified!==before.lastModified||after.size!==before.size||current.crc32!==source.crc32)throw new Error('تغير الملف أثناء الفهرسة؛ أعد المحاولة.');
 const record:LocalTextRecord={format:'baraq-local-text',version:1,path:[...path],name,bytes:before.size,modified:before.lastModified,crc32:source.crc32,text,indexedAt:new Date().toISOString()};
 await persistIndex(root,record,timed);
}
function parseRecord(value:unknown):LocalTextRecord|null{
 if(!value||typeof value!=='object')return null;const r=value as LocalTextRecord;
 if(r.format!=='baraq-local-text'||r.version!==1||!Array.isArray(r.path)||r.path.length>32||r.path.some(p=>typeof p!=='string')||typeof r.name!=='string'||!(contentFileKind(r.name)||r.source==='image-ocr-reviewed'&&ocrImageName(r.name))||!Number.isSafeInteger(r.bytes)||r.bytes<0||r.bytes>MAX_CONTENT_BYTES||!Number.isFinite(r.modified)||typeof r.crc32!=='string'||!/^[0-9a-f]{8}$/.test(r.crc32)||typeof r.text!=='string'||r.text.length>MAX_CONTENT_CHARACTERS||typeof r.indexedAt!=='string'||!Number.isFinite(Date.parse(r.indexedAt)))return null;
 try{if(r.source==='pdf-ocr-reviewed')pdfReviewPath(r.path,r.name,r.pages);validateLocalSegment(r.name);r.path.forEach(validateLocalSegment);}catch{return null;}return r;
}
export async function searchLocalText(root:FileSystemDirectoryHandle,query:string,signal:AbortSignal):Promise<{hits:LocalTextHit[];stale:number;incomplete:number}>{
 const needle=query.trim().toLocaleLowerCase();if(needle.length<2||needle.length>200)throw new Error('اكتب بين حرفين و200 حرف للبحث.');
 const records=new Map<string,LocalTextRecord>(),recordNames=new Map<string,string>(),files=await localIndexFiles(root,signal);let indexes=0;
 for(const entry of files.active){
  signal.throwIfAborted();
  if(entry.kind!=='file'||!entry.name.startsWith(prefix)||!entry.name.endsWith('.json'))continue;
  if(++indexes>maxIndexes)throw new Error('تجاوز الفهرس 200 نسخة؛ يلزم تنظيمه قبل البحث الكامل.');
  const file=await(await root.getFileHandle(entry.name)).getFile();if(file.size>MAX_CONTENT_CHARACTERS*6+8192)continue;
  let value:unknown;try{value=JSON.parse(await file.text());}catch{continue;}const record=parseRecord(value);if(!record)continue;
  const key=JSON.stringify([...record.path,record.name]),prior=records.get(key);if(!prior||Date.parse(record.indexedAt)>Date.parse(prior.indexedAt)||Date.parse(record.indexedAt)===Date.parse(prior.indexedAt)&&entry.name>(recordNames.get(key)??'')){records.set(key,record);recordNames.set(key,entry.name);}
 }
 const hits:LocalTextHit[]=[];let stale=0;
 for(const record of records.values()){
  signal.throwIfAborted();const position=record.text.toLocaleLowerCase().indexOf(needle);if(position<0)continue;
  try{
   const handle=await(await localFolder(root,record.path)).getFileHandle(record.name),file=await handle.getFile();
   if(file.size!==record.bytes||file.lastModified!==record.modified){stale++;continue;}
   const digest=await fingerprint(file,signal),after=await handle.getFile();
   if(digest.crc32!==record.crc32||after.size!==file.size||after.lastModified!==file.lastModified){stale++;continue;}
   hits.push({path:record.path,name:record.name,snippet:record.text.slice(Math.max(0,position-60),position+160),...(record.source==='pdf-ocr-reviewed'?{pages:record.pages}:{})});
  }catch(error){if(error instanceof DOMException&&error.name==='NotFoundError'){stale++;continue;}throw error;}
 }
 return {hits,stale,incomplete:files.incomplete};
}

export interface LocalOcrReview {name:string;path:string[];bytes:number;modified:number;crc32:string;text:string;confidence:number;kind?:'pdf';pages?:number[]}
function imageSourcePath(path:string[],name:string){if(path.length>32||!ocrImageName(name)||path.some(segment=>segment.startsWith('.baraq-')))throw new Error('مسار صورة غير مناسب للفهرسة.');validateLocalSegment(name);path.forEach(validateLocalSegment);}
export async function extractLocalImageText(root:FileSystemDirectoryHandle,path:string[],name:string,signal:AbortSignal,progress:(percent:number)=>void):Promise<LocalOcrReview>{
 imageSourcePath(path,name);await ensureIndexCapacity(root,signal);
 const handle=await(await localFolder(root,path)).getFileHandle(name),before=await handle.getFile(),source=await fingerprint(before,signal);
 const result=await(await import('./localOcr')).recognizeLocalImage(before,signal,progress),after=await handle.getFile(),current=await fingerprint(after,signal);
 signal.throwIfAborted();if(before.lastModified!==after.lastModified||before.size!==after.size||source.crc32!==current.crc32)throw new Error('تغيرت الصورة أثناء OCR؛ لم تُعتمد النتيجة.');
 return {name,path:[...path],bytes:before.size,modified:before.lastModified,crc32:source.crc32,...result};
}
export async function saveReviewedOcrText(root:FileSystemDirectoryHandle,review:LocalOcrReview,text:string,signal:AbortSignal){
 if(review.kind==='pdf'){pdfReviewPath(review.path,review.name,review.pages);}else imageSourcePath(review.path,review.name);await ensureIndexCapacity(root,signal);
 const {checkDocumentText}=await import('./contentText');const accepted=checkDocumentText(text),handle=await(await localFolder(root,review.path)).getFileHandle(review.name),file=await handle.getFile(),current=await fingerprint(file,signal);
 signal.throwIfAborted();if(file.size!==review.bytes||file.lastModified!==review.modified||current.crc32!==review.crc32)throw new Error('تغيرت الوثيقة منذ استخراج النص؛ أعد OCR قبل حفظ الفهرس.');
 const record:LocalTextRecord={format:'baraq-local-text',version:1,path:review.path,name:review.name,bytes:review.bytes,modified:review.modified,crc32:review.crc32,text:accepted,indexedAt:new Date().toISOString(),source:review.kind==='pdf'?'pdf-ocr-reviewed':'image-ocr-reviewed',confidence:review.confidence,...(review.kind==='pdf'?{pages:review.pages}:{})};
 await persistIndex(root,record,signal);
}

function pdfReviewPath(path:string[],name:string,pages:number[]|undefined){
 if(!/\.pdf$/i.test(name)||path.length>32||path.some(segment=>segment.startsWith('.baraq-'))||!pages||!pages.length||pages.length>3||pages.some((page,index)=>!Number.isSafeInteger(page)||page<1||page>100||index>0&&page!==pages[index-1]+1))throw new Error('مسار PDF أو صفحات المراجعة غير صالحة.');validateLocalSegment(name);path.forEach(validateLocalSegment);
}
export async function extractLocalPdfOcr(root:FileSystemDirectoryHandle,path:string[],name:string,first:number,last:number,signal:AbortSignal,progress:(percent:number)=>void):Promise<LocalOcrReview>{
 const {pdfOcrPages}=await import('./pdfOcrPolicy');const pages=pdfOcrPages(first,last);pdfReviewPath(path,name,pages);await ensureIndexCapacity(root,signal);
 const handle=await(await localFolder(root,path)).getFileHandle(name),before=await handle.getFile(),source=await fingerprint(before,signal);
 const result=await(await import('./localPdfOcr')).recognizeLocalPdf(before,first,last,signal,progress),after=await handle.getFile(),current=await fingerprint(after,signal);
 signal.throwIfAborted();if(before.lastModified!==after.lastModified||before.size!==after.size||source.crc32!==current.crc32)throw new Error('تغير PDF أثناء OCR؛ لم تُعتمد النتيجة.');
 return {name,path:[...path],bytes:before.size,modified:before.lastModified,crc32:source.crc32,kind:'pdf',...result};
}

export interface LocalIndexRetirementPlan {active:number;retired:number;total:number;revision:number;incomplete:number;copies:{name:string;source:string;bytes:number;modified:number;crc32:string}[]}
export async function planLocalIndexRetirement(root:FileSystemDirectoryHandle,signal:AbortSignal):Promise<LocalIndexRetirementPlan>{
 const files=await localIndexFiles(root,signal),groups=new Map<string,{name:string;source:string;bytes:number;modified:number;crc32:string;date:number}[]>();
 for(const entry of files.active){
  signal.throwIfAborted();const file=await(await root.getFileHandle(entry.name)).getFile();if(file.size>MAX_CONTENT_CHARACTERS*6+8192)continue;const bytes=new Uint8Array(await file.arrayBuffer());signal.throwIfAborted();let value:unknown;try{value=JSON.parse(new TextDecoder().decode(bytes));}catch{continue;}const record=parseRecord(value);if(!record)continue;
  const key=JSON.stringify([...record.path,record.name]),group=groups.get(key)??[];group.push({name:entry.name,source:[...record.path,record.name].join(' / '),bytes:file.size,modified:file.lastModified,crc32:finishCrc32(updateCrc32(0xffffffff,bytes)),date:Date.parse(record.indexedAt)});groups.set(key,group);
 }
 const copies:LocalIndexRetirementPlan['copies']=[];for(const group of groups.values()){group.sort((a,b)=>b.date-a.date||b.name.localeCompare(a.name));for(const old of group.slice(1))if(canRetireIndex(old.name))copies.push(old);}copies.sort((a,b)=>a.name.localeCompare(b.name));
 return {active:files.active.length,retired:files.retired.length,total:files.total,revision:files.revision,incomplete:files.incomplete,copies:copies.slice(0,200)};
}
export async function confirmLocalIndexRetirement(root:FileSystemDirectoryHandle,plan:LocalIndexRetirementPlan,signal:AbortSignal){
 await withLocalIndexLock(signal,async()=>{
  const current=await planLocalIndexRetirement(root,signal);if(JSON.stringify(current)!==JSON.stringify(plan)||!current.copies.length)throw new Error('تغير الفهرس منذ المراجعة؛ افحص النسخ مرة أخرى.');
  const files=await localIndexFiles(root,signal);if(files.controlCount>=100)throw new Error('وصل سجل تنظيم الفهرس إلى 100 عملية.');
  await writeNewLocalFile(root,[],new File([JSON.stringify(retentionEvent(files.revision+1,'retire',current.copies.map(copy=>copy.name)))],retentionEventName(),{type:'application/json'}),signal);
 });
}
export async function restoreRetiredLocalIndexes(root:FileSystemDirectoryHandle,signal:AbortSignal){
 await withLocalIndexLock(signal,async()=>{const files=await localIndexFiles(root,signal);if(!files.retired.length)throw new Error('لا توجد نسخ فهرس مستبعدة.');if(files.active.length+files.retired.length>200)throw new Error('إعادة كل النسخ ستتجاوز حد 200 نسخة نشطة؛ احتفظ بالسجل الحالي.');if(files.controlCount>=100)throw new Error('وصل سجل تنظيم الفهرس إلى 100 عملية.');await writeNewLocalFile(root,[],new File([JSON.stringify(retentionEvent(files.revision+1,'restore',files.retired.map(entry=>entry.name)))],retentionEventName(),{type:'application/json'}),signal);});
}
