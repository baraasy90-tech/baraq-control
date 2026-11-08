import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { validateUpload } from '@/lib/supabase/uploadPolicy';
import {blobFingerprint,verifyImportedCopy,type ImportVerification} from './importVerification';
import type { ImportEntry } from './importEntries';

export interface ImportJob extends ImportEntry { id:string; status:'queued'|'uploading'|'done'|'error'; error?:string; uploaded?:boolean; folderId?:string; verification?:ImportVerification; verifying?:boolean; sourceFingerprint?:{bytes:number;crc32:string} }
export const importJobs=(entries:ImportEntry[]):ImportJob[]=>entries.map(entry=>({...entry,id:crypto.randomUUID(),status:'queued'}));

function displayError(error:unknown) {
 const message=error&&typeof error==='object'&&'message'in error?String(error.message):'';
 if(/[\u0600-\u06ff]/.test(message))return message;
 if(/size|too large|413/i.test(message))return 'حجم الملف يتجاوز الحد المتاح في الخادم.';
 if(/quota|capacity|space/i.test(message))return 'مساحة التخزين المتاحة غير كافية.';
 return 'تعذّر الرفع أو تأكيد الحفظ. إعادة المحاولة تتحقق من السجل قبل استكماله دون تكرار الملف.';
}

export async function runImportJobs(jobs:ImportJob[],projectId:string,parentId:string|null,ownerId:string,stop:{current:boolean},changed:(job:ImportJob)=>void|Promise<void>,verifyCopy=false) {
 const session=(await supabase.auth.getSession()).data.session;
 if(!session||session.user.id!==ownerId)throw new Error('انتهت جلسة الحساب. سجّل الدخول من جديد.');
 // Bind this batch to its starting identity, even if the application later signs out.
 const client=createClient<Database>(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:`Bearer ${session.access_token}`}}});
 const folders=new Map<string,Promise<string>>();
 const ensure=(parent:string|null,name:string)=>{
  const key=JSON.stringify([parent,name.trim()]);let value=folders.get(key);
  if(!value){value=(async()=>{const result=await client.rpc('ensure_document_folder',{p_project_id:projectId,p_parent_folder_id:parent,p_name:name,p_id:crypto.randomUUID()});if(result.error)throw result.error;return result.data;})();folders.set(key,value);value.catch(()=>folders.delete(key));}
  return value;
 };
 const folderFor=async(parts:string[])=>{let id=parentId;for(const name of parts)id=await ensure(id,name);return id;};
 let next=0;
 await Promise.all(Array.from({length:verifyCopy?1:3},async()=>{
  while(next<jobs.length&&!stop.current){const job=jobs[next++];if(job.status==='done')continue;
   job.status='uploading';job.error=undefined;job.verification=undefined;job.verifying=false;await changed(job);
   try{
    if(job.file){validateUpload('documents',job.file);if(verifyCopy){const fingerprint=await blobFingerprint(job.file);if(job.sourceFingerprint&&(job.sourceFingerprint.bytes!==fingerprint.bytes||job.sourceFingerprint.crc32!==fingerprint.crc32))throw new Error('اختلف محتوى المصدر عن سجل الاستئناف؛ لم يُستكمل النسخ.');job.sourceFingerprint=fingerprint;await changed(job);}}
    if(!job.file){job.folderId=(await folderFor(job.path))??undefined;job.status='done';await changed(job);continue;}
    if(!job.folderId){const resolved=job.path.length>1?await folderFor(job.path.slice(0,-1)):parentId??await ensure(null,'ملفات عامة');if(!resolved)throw new Error('تعذّر تحديد مجلد الوجهة.');job.folderId=resolved;}
    await uploadImportFile(client,job,ownerId,verifyCopy,()=>changed(job));
    job.status='done';job.verifying=false;
   }catch(error){job.status='error';job.verifying=false;job.error=displayError(error);}
   await changed(job);
  }
 }));
}

async function uploadImportFile(client:SupabaseClient<Database>,job:ImportJob,ownerId:string,verifyCopy:boolean,changed:()=>void|Promise<void>) {
 const path=`${ownerId}/${job.id}`;
 const existing=await client.from('documents').select('id,file_url,folder_id,trashed_at,name,row_version').eq('id',job.id).maybeSingle();
 if(existing.error)throw existing.error;
 if(existing.data){if(existing.data.trashed_at)throw new Error('الملف نُقل إلى السلة أثناء العملية؛ استعده من السلة قبل الاستكمال.');if(existing.data.file_url!==path||existing.data.folder_id!==job.folderId)throw new Error('تغير سجل الملف؛ حدّث القائمة قبل إعادة المحاولة.');if(verifyCopy)await verifyCloudCopy(client,job,path,changed,existing.data.row_version);return;}
 if(!job.uploaded){
  const contentType=validateUpload('documents',job.file!);
  const body=job.file!.type===contentType?job.file!:new Blob([job.file!],{type:contentType});
  const result=await client.storage.from('documents').upload(path,body,{upsert:false,contentType});
  if(result.error&&String(result.error.statusCode)!=='409'&&!/already exists|duplicate/i.test(result.error.message))throw result.error;
  job.uploaded=true;
 }
 if(verifyCopy)await verifyCloudCopy(client,job,path,changed);
 const result=await client.from('documents').insert({id:job.id,folder_id:job.folderId!,name:job.file!.name,file_url:path});
 if(result.error){
  // A lost response or concurrent retry may already have committed this exact UUID.
  const verified=await client.from('documents').select('file_url,folder_id,trashed_at').eq('id',job.id).maybeSingle();
  if(verified.data?.trashed_at)throw new Error('الملف نُقل إلى السلة أثناء العملية؛ استعده من السلة قبل الاستكمال.');
  if(verified.data?.file_url===path&&verified.data.folder_id===job.folderId){if(verifyCopy)await confirmCopiedRecord(client,job,path);return;}
  throw result.error;
 }
 if(verifyCopy)await confirmCopiedRecord(client,job,path);
}


async function confirmCopiedRecord(client:SupabaseClient<Database>,job:ImportJob,path:string,expectedVersion?:number){
 const record=await client.from('documents').select('file_url,folder_id,trashed_at,name,row_version').eq('id',job.id).single();
 if(record.error)throw record.error;
 if(record.data.trashed_at||record.data.file_url!==path||record.data.folder_id!==job.folderId||record.data.name!==job.file!.name||(expectedVersion!==undefined&&record.data.row_version!==expectedVersion))throw new Error('تغير سجل الوجهة أثناء التحقق؛ لم تُعتمد عملية النسخ.');
 if(job.verification)job.verification.rowVersion=record.data.row_version;
}
async function verifyCloudCopy(client:SupabaseClient<Database>,job:ImportJob,path:string,changed:()=>void|Promise<void>,expectedVersion?:number){
 job.verifying=true;await changed();
 const downloaded=await client.storage.from('documents').download(path,{}, {cache:'no-store',signal:AbortSignal.timeout(120000)});
 if(downloaded.error)throw downloaded.error;
 job.verification=await verifyImportedCopy(job.file!,downloaded.data,job.getCurrentFile);
 if(job.sourceFingerprint&&(job.sourceFingerprint.bytes!==job.verification.bytes||job.sourceFingerprint.crc32!==job.verification.crc32))throw new Error('تغير محتوى المصدر منذ حفظ سجل الاستئناف؛ لم يُعتمد النسخ.');
 if(expectedVersion!==undefined)await confirmCopiedRecord(client,job,path,expectedVersion);
}
