import type {ImportEntry} from './importEntries';
import {planImportCopy} from './importCopyPlan';
import {localFolder,validateLocalSegment,writeNewLocalFile} from './localArchiveStore';
import {blobFingerprint} from './importVerification';
export interface LocalImportJob extends ImportEntry {id:string;status:'queued'|'saving'|'done'|'error';bytes?:number;crc32?:string;error?:string}
export function localImportJobs(entries:ImportEntry[]):LocalImportJob[]{
 planImportCopy(entries,'device');for(const entry of entries)entry.path.forEach(validateLocalSegment);
 return entries.map(entry=>({...entry,id:crypto.randomUUID(),status:'queued'}));
}
const key=(name:string)=>name.normalize('NFKC').trim().toLowerCase();
/** Detect conflicts across the whole selected tree before creating any destination. */
export async function checkLocalImport(root:FileSystemDirectoryHandle,base:string[],jobs:LocalImportJob[],signal:AbortSignal){
 planImportCopy(jobs,'device');for(const job of jobs)job.path.forEach(validateLocalSegment);
 const nodes=new Map<string,{path:string[];kind:'file'|'directory'}>();
 for(const job of jobs)for(let depth=1;depth<=job.path.length;depth++){const path=job.path.slice(0,depth);nodes.set(JSON.stringify(path),{path,kind:depth===job.path.length&&job.file?'file':'directory'});}
 const directories=new Map<string,FileSystemDirectoryHandle|null>([['[]',await localFolder(root,base)]]),listings=new Map<string,Map<string,FileSystemHandle>>();let scanned=0;
 for(const node of [...nodes.values()].sort((a,b)=>a.path.length-b.path.length)){
  signal.throwIfAborted();const parentKey=JSON.stringify(node.path.slice(0,-1)),parent=directories.get(parentKey),name=node.path.at(-1)!;
  if(!parent){if(node.kind==='directory')directories.set(JSON.stringify(node.path),null);continue;}
  let listing=listings.get(parentKey);if(!listing){listing=new Map();for await(const entry of (parent as unknown as {values():AsyncIterable<FileSystemHandle>}).values()){signal.throwIfAborted();if(++scanned>50000||listing.size>=10000)throw new Error('وجهة النسخ كبيرة جداً للفحص الكامل؛ اختر مجلداً أصغر.');if(listing.has(key(entry.name)))throw new Error('توجد أسماء متكافئة في وجهة النسخ؛ نظّمها قبل الإضافة.');listing.set(key(entry.name),entry);}listings.set(parentKey,listing);}
  const existing=listing.get(key(name));if(existing&&(existing.name!==name||existing.kind!==node.kind||node.kind==='file'))throw new Error('يوجد عنصر متعارض في الوجهة: '+[...base,...node.path].join(' / ')+'؛ لم تبدأ إضافة الدفعة ولم يُستبدل الموجود.');
  if(node.kind==='directory')directories.set(JSON.stringify(node.path),existing?await parent.getDirectoryHandle(name):null);
 }
}
export async function runLocalImport(root:FileSystemDirectoryHandle,base:string[],jobs:LocalImportJob[],signal:AbortSignal,changed:()=>void){
 await checkLocalImport(root,base,jobs,signal);
 for(const job of jobs){signal.throwIfAborted();job.status='saving';job.error=undefined;changed();
  try{
   if(!job.file)await localFolder(root,[...base,...job.path],true);
   else{await localFolder(root,[...base,...job.path.slice(0,-1)],true);const result=await writeNewLocalFile(root,[...base,...job.path.slice(0,-1)],job.file,signal);if(job.getCurrentFile){const current=await job.getCurrentFile(),digest=await blobFingerprint(current,signal);if(current.size!==job.file.size||current.lastModified!==job.file.lastModified||digest.bytes!==result.bytes||digest.crc32!==result.crc32)throw new Error('تغير المصدر أثناء النسخ؛ الأصل محفوظ لكن لا تعتمد نسخة الوجهة.');}job.bytes=result.bytes;job.crc32=result.crc32;}
   job.status='done';changed();
  }catch(error){job.status='error';job.error=error instanceof DOMException&&error.name==='AbortError'?'أُوقفت الإضافة؛ لا تعتمد الملف الجاري حتى التحقق منه.':error instanceof Error&&/[\u0600-\u06ff]/.test(error.message)?error.message:'تعذّر حفظ العنصر على الجهاز؛ الأصل محفوظ، وقد تبقى نسخة غير مكتملة.';changed();throw new Error(job.error);}
 }
}

export function localImportReceipt(jobs:LocalImportJob[]){return {format:'baraq-local-tree-import',version:1,createdAt:new Date().toISOString(),sourceRetained:true,complete:jobs.length>0&&jobs.every(job=>job.status==='done'),items:jobs.map(job=>({path:job.path,kind:job.file?'file':'directory',status:job.status,bytes:job.bytes??null,crc32:job.crc32??null,error:job.error??null,sourceCheck:job.file?(job.getCurrentFile?'live-handle':'selected-snapshot'):null}))};}
