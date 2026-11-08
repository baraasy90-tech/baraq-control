import type {ImportJob} from './importUpload';
import {finishCrc32,updateCrc32} from './archiveExportPlan';
export interface ImportVerification {bytes:number;crc32:string;verifiedAt:string;sourceCheck:'live-handle'|'selected-snapshot';sourceRetained:true;rowVersion?:number}
export async function blobFingerprint(blob:Blob,signal?:AbortSignal){
 const reader=blob.stream().getReader();let bytes=0,state=0xffffffff;
 try{for(;;){signal?.throwIfAborted();const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;state=updateCrc32(state,chunk.value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 return {bytes,crc32:finishCrc32(state)};
}
export async function verifyImportedCopy(source:File,remote:Blob,getCurrentFile?:()=>Promise<File>):Promise<ImportVerification>{
 const before=await blobFingerprint(source),downloaded=await blobFingerprint(remote);
 if(before.bytes!==downloaded.bytes||before.crc32!==downloaded.crc32)throw new Error('لم تتطابق بايتات النسخة السحابية مع الأصل؛ لم يُعتمد النسخ. الأصل محفوظ.');
 const current=getCurrentFile?await getCurrentFile():source,after=await blobFingerprint(current);
 if(current.size!==source.size||current.lastModified!==source.lastModified||after.bytes!==before.bytes||after.crc32!==before.crc32)throw new Error('تغير الأصل أثناء النسخ؛ لم تُعتمد العملية. أعد اختيار الملف بعد استقرار التعديل.');
 return {...before,verifiedAt:new Date().toISOString(),sourceCheck:getCurrentFile?'live-handle':'selected-snapshot',sourceRetained:true};
}

export function buildImportReceipt(jobs:ImportJob[],projectId:string,parentFolderId:string|null){
 return {format:'baraq-device-to-cloud-copy',version:1,createdAt:new Date().toISOString(),projectId,parentFolderId,sourceRetained:true,complete:jobs.length>0&&jobs.every(job=>job.status==='done'&&(!job.file||!!job.verification)),files:jobs.map(job=>({path:job.path,kind:job.file?'file':'directory',documentId:job.file?job.id:null,folderId:job.folderId??null,status:job.status,error:job.error??null,verification:job.status==='done'?job.verification??null:null}))};
}
