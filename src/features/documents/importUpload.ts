import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { validateUpload } from '@/lib/supabase/uploadPolicy';
import type { ImportEntry } from './importEntries';

export interface ImportJob extends ImportEntry { id:string; status:'queued'|'uploading'|'done'|'error'; error?:string; uploaded?:boolean; folderId?:string }
export const importJobs=(entries:ImportEntry[]):ImportJob[]=>entries.map(entry=>({...entry,id:crypto.randomUUID(),status:'queued'}));

function displayError(error:unknown) {
 const message=error&&typeof error==='object'&&'message'in error?String(error.message):'';
 if(/[\u0600-\u06ff]/.test(message))return message;
 if(/size|too large|413/i.test(message))return 'حجم الملف يتجاوز الحد المتاح في الخادم.';
 if(/quota|capacity|space/i.test(message))return 'مساحة التخزين المتاحة غير كافية.';
 return 'تعذّر الرفع أو تأكيد الحفظ. إعادة المحاولة تتحقق من السجل قبل استكماله دون تكرار الملف.';
}

export async function runImportJobs(jobs:ImportJob[],projectId:string,parentId:string|null,ownerId:string,stop:{current:boolean},changed:()=>void) {
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
 await Promise.all(Array.from({length:3},async()=>{
  while(next<jobs.length&&!stop.current){const job=jobs[next++];if(job.status==='done')continue;
   job.status='uploading';job.error=undefined;changed();
   try{
    if(job.file)validateUpload('documents',job.file);
    if(!job.file){await folderFor(job.path);job.status='done';changed();continue;}
    if(!job.folderId){const resolved=job.path.length>1?await folderFor(job.path.slice(0,-1)):parentId??await ensure(null,'ملفات عامة');if(!resolved)throw new Error('تعذّر تحديد مجلد الوجهة.');job.folderId=resolved;}
    await uploadImportFile(client,job,ownerId);
    job.status='done';
   }catch(error){job.status='error';job.error=displayError(error);}
   changed();
  }
 }));
}

async function uploadImportFile(client:SupabaseClient<Database>,job:ImportJob,ownerId:string) {
 const path=`${ownerId}/${job.id}`;
 const existing=await client.from('documents').select('id,file_url,folder_id,trashed_at').eq('id',job.id).maybeSingle();
 if(existing.error)throw existing.error;
 if(existing.data){if(existing.data.trashed_at)throw new Error('الملف نُقل إلى السلة أثناء العملية؛ استعده من السلة قبل الاستكمال.');if(existing.data.file_url!==path||existing.data.folder_id!==job.folderId)throw new Error('تغير سجل الملف؛ حدّث القائمة قبل إعادة المحاولة.');return;}
 if(!job.uploaded){
  const contentType=validateUpload('documents',job.file!);
  const body=job.file!.type===contentType?job.file!:new Blob([job.file!],{type:contentType});
  const result=await client.storage.from('documents').upload(path,body,{upsert:false,contentType});
  if(result.error&&String(result.error.statusCode)!=='409'&&!/already exists|duplicate/i.test(result.error.message))throw result.error;
  job.uploaded=true;
 }
 const result=await client.from('documents').insert({id:job.id,folder_id:job.folderId!,name:job.file!.name,file_url:path});
 if(result.error){
  // A lost response or concurrent retry may already have committed this exact UUID.
  const verified=await client.from('documents').select('file_url,folder_id,trashed_at').eq('id',job.id).maybeSingle();
  if(verified.data?.trashed_at)throw new Error('الملف نُقل إلى السلة أثناء العملية؛ استعده من السلة قبل الاستكمال.');
  if(verified.data?.file_url===path&&verified.data.folder_id===job.folderId)return;
  throw result.error;
 }
}
