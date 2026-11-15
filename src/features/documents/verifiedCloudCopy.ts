import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database.types';
import {localFolder,writeNewLocalFile} from './localArchiveStore';

/** Copies one bounded private object. Caller supplies record authorization and owns receipts. */
export async function copyVerifiedCloudFile(client:SupabaseClient<Database>,input:{bucket:'documents'|'checklist-photos';path:string;maxBytes:number;root:FileSystemDirectoryHandle;folderPath:string[];name:string;type:string},signal:AbortSignal,guard:()=>Promise<void>){
 const version=async()=>{
  const result=await client.storage.from(input.bucket).info(input.path),data=result.data;
  if(result.error||!data||typeof data.id!=='string'||typeof data.version!=='string'||!data.version||!Number.isSafeInteger(data.size)||data.size!<=0||data.size!>input.maxBytes)throw new Error('تعذّر التحقق من نسخة المصدر أو تجاوز الحجم المسموح.');
  return {id:data.id,version:data.version,size:data.size!,etag:typeof data.etag==='string'?data.etag:null};
 };
 const before=await version(),signed=await client.storage.from(input.bucket).createSignedUrl(input.path,600);
 if(signed.error||!signed.data?.signedUrl)throw new Error('تعذّر إنشاء رابط صالح للملف.');
 const response=await fetch(signed.data.signedUrl,{signal,cache:'no-store'});
 if(!response.ok||!response.body){await response.body?.cancel().catch(()=>{});throw new Error('تعذّر تنزيل الملف.');}
 const normalize=(tag:string)=>tag.trim().replace(/^W\//i,'').replace(/^"|"$/g,'');
 const tag=response.headers.get('etag');
 if(tag&&before.etag&&normalize(tag)!==normalize(before.etag)){await response.body.cancel();throw new Error('نسخة التنزيل لا تطابق المصدر.');}
 const reader=response.body.getReader(),chunks:Uint8Array<ArrayBuffer>[]=[];let bytes=0;
 try{while(true){signal.throwIfAborted();const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>before.size||bytes>input.maxBytes)throw new Error('اختلف حجم التنزيل عن المصدر.');chunks.push(new Uint8Array(next.value));}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 if(bytes!==before.size)throw new Error('التنزيل غير مكتمل؛ لم تُعتمد نسخة.');
 if(JSON.stringify(before)!==JSON.stringify(await version()))throw new Error('تغير المصدر أثناء التنزيل؛ أعد المحاولة.');
 await guard();signal.throwIfAborted();await localFolder(input.root,input.folderPath,true);
 const copied=await writeNewLocalFile(input.root,input.folderPath,new File(chunks,input.name,{type:input.type}),signal);
 await guard();if(JSON.stringify(before)!==JSON.stringify(await version()))throw new Error('تغير المصدر بعد النسخ؛ الملف المحلي باقٍ دون اعتماد إيصال.');
 return {bytes:copied.bytes,crc32:copied.crc32,sourceVersion:before};
}
