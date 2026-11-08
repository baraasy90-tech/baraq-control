import type {ImportEntry} from './importEntries';
import {validateImportPath,MAX_IMPORT_ENTRIES} from './importEntries';
import type {ImportJob} from './importUpload';
export interface SavedCopyJob {id:string;path:string[];file?:{name:string;size:number;lastModified:number};folderId?:string;sourceFingerprint?:{bytes:number;crc32:string};status:ImportJob['status']}
export interface SavedCopy {id:string;scope:string;projectId:string;parentId:string|null;createdAt:string;jobs:SavedCopyJob[]}
const checkpointFailure=(error:unknown)=>new Error(error instanceof Error&&/[\u0600-\u06ff]/.test(error.message)?error.message:'تعذّر حفظ سجل الاستئناف المحلي؛ لم يُعتمد التقدم.');
const scopeKey=(userId:string,projectId:string)=>JSON.stringify([userId,projectId]);
async function openDb(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('baraq-copy-checkpoints',1);request.onupgradeneeded=()=>{request.result.createObjectStore('batches',{keyPath:'scope'});request.result.createObjectStore('jobs',{keyPath:'id'}).createIndex('batchId','batchId');};request.onerror=()=>reject(new Error('تعذّر فتح سجل الاستئناف المحلي. لم يُعتمد حفظ التقدم.'));request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};});}
function savedJob(job:ImportJob):SavedCopyJob{return {id:job.id,path:[...job.path],file:job.file?{name:job.file.name,size:job.file.size,lastModified:job.file.lastModified}:undefined,folderId:job.folderId,sourceFingerprint:job.sourceFingerprint,status:job.status};}
function validJob(value:unknown):value is SavedCopyJob{
 if(!value||typeof value!=='object')return false;const j=value as SavedCopyJob;
 if(typeof j.id!=='string'||!/^[0-9a-f-]{36}$/.test(j.id)||!Array.isArray(j.path)||j.path.some(p=>typeof p!=='string')||!['queued','uploading','done','error'].includes(j.status))return false;
 try{validateImportPath(j.path);}catch{return false;}
 if(j.folderId!==undefined&&(typeof j.folderId!=='string'||!/^[0-9a-f-]{36}$/.test(j.folderId)))return false;
 if(j.file&&(typeof j.file.name!=='string'||j.file.name!==j.path.at(-1)||!Number.isSafeInteger(j.file.size)||j.file.size<0||j.file.size>50*1024*1024||!Number.isFinite(j.file.lastModified)))return false;
 if(j.sourceFingerprint&&(!j.file||typeof j.sourceFingerprint.crc32!=='string'||j.sourceFingerprint.bytes!==j.file.size||!/^[0-9a-f]{8}$/.test(j.sourceFingerprint.crc32)))return false;
 return true;
}
export function reattachCopySources(saved:SavedCopy,entries:ImportEntry[]):ImportJob[]{
 const byPath=new Map(entries.map(entry=>[JSON.stringify(entry.path),entry]));
 if(byPath.size!==entries.length||entries.length!==saved.jobs.length)throw new Error('أعد اختيار الدفعة الأصلية كاملة بنفس المسارات؛ لم يبدأ الاستئناف.');
 return saved.jobs.map(job=>{const entry=byPath.get(JSON.stringify(job.path));if(!entry||!!entry.file!==!!job.file||job.file&&(entry.file!.name!==job.file.name||entry.file!.size!==job.file.size||entry.file!.lastModified!==job.file.lastModified))throw new Error('اختلف ملف المصدر عن سجل الاستئناف؛ لم يبدأ النسخ.');return {...entry,id:job.id,folderId:job.folderId,sourceFingerprint:job.sourceFingerprint,status:'queued',uploaded:false};});
}
export async function loadCopyCheckpoint(userId:string,projectId:string):Promise<SavedCopy|null>{
 const db=await openDb(),scope=scopeKey(userId,projectId);
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction(['batches','jobs'],'readonly'),request=tx.objectStore('batches').get(scope);let result:SavedCopy|null=null,invalid=false;
 request.onsuccess=()=>{const header=request.result;if(!header)return;if(header.scope!==scope||header.projectId!==projectId||!Number.isInteger(header.jobCount)||header.jobCount<1||header.jobCount>MAX_IMPORT_ENTRIES||typeof header.id!=='string'||!/^[0-9a-f-]{36}$/.test(header.id)||header.parentId!==null&&(typeof header.parentId!=='string'||!/^[0-9a-f-]{36}$/.test(header.parentId))){invalid=true;return;}const jobs=tx.objectStore('jobs').index('batchId').getAll(header.id,MAX_IMPORT_ENTRIES+1);jobs.onsuccess=()=>{const values=jobs.result;if(values.length!==header.jobCount||values.length>MAX_IMPORT_ENTRIES||values.some(j=>!validJob(j))){invalid=true;return;}result={...header,jobs:values};};};
 tx.oncomplete=()=>invalid?reject(new Error('سجل الاستئناف غير صالح؛ لا تعتمد بياناته.')):resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });}finally{db.close();}
}
export async function createCopyCheckpoint(userId:string,projectId:string,parentId:string|null,jobs:ImportJob[]):Promise<SavedCopy>{
 if(!userId||!projectId||!jobs.length||jobs.length>MAX_IMPORT_ENTRIES||jobs.some(job=>!validJob(savedJob(job))))throw new Error('دفعة الاستئناف غير صالحة.');
 const db=await openDb(),header={id:crypto.randomUUID(),scope:scopeKey(userId,projectId),projectId,parentId,createdAt:new Date().toISOString(),jobCount:jobs.length};
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(['batches','jobs'],'readwrite'),batches=tx.objectStore('batches'),old=batches.get(header.scope);let occupied=false;old.onsuccess=()=>{if(old.result){occupied=true;tx.abort();return;}batches.put(header);for(const job of jobs)tx.objectStore('jobs').put({...savedJob(job),batchId:header.id});};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('تعذّر حفظ سجل الاستئناف؛ لم يبدأ النسخ.'));tx.onabort=()=>reject(new Error(occupied?'توجد دفعة محفوظة؛ استأنفها أو امسح سجلها قبل بدء دفعة جديدة.':'تعذّر حفظ سجل الاستئناف؛ لم يبدأ النسخ.'));});return {...header,jobs:jobs.map(savedJob)};}catch(error){throw checkpointFailure(error);}finally{db.close();}
}
export async function saveCopyCheckpointJob(saved:SavedCopy,job:ImportJob){
 const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(['batches','jobs'],'readwrite'),request=tx.objectStore('batches').get(saved.scope);request.onsuccess=()=>{if(request.result?.id!==saved.id){tx.abort();return;}tx.objectStore('jobs').put({...savedJob(job),batchId:saved.id});};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('تعذّر حفظ تقدم النسخ؛ أوقف الدفعة وأعد المحاولة.'));tx.onabort=()=>reject(new Error('تغير سجل الاستئناف أو تعذّر حفظه؛ لم يُعتمد التقدم.'));});}catch(error){throw checkpointFailure(error);}finally{db.close();}
}
export async function clearCopyCheckpoint(userId:string,projectId:string){
 const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(['batches','jobs'],'readwrite'),batches=tx.objectStore('batches'),request=batches.get(scopeKey(userId,projectId));request.onsuccess=()=>{if(!request.result)return;if(typeof request.result.id==='string'&&/^[0-9a-f-]{36}$/.test(request.result.id)){const cursor=tx.objectStore('jobs').index('batchId').openCursor(request.result.id);cursor.onsuccess=()=>{if(cursor.result){cursor.result.delete();cursor.result.continue();}};}batches.delete(scopeKey(userId,projectId));};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('تعذّر مسح سجل الاستئناف المحلي.'));tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
