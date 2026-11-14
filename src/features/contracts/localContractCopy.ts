import {exportClient} from '@/features/documents/archiveExport';
import {safeExportName} from '@/features/documents/archiveExportPlan';
import {localFolder,writeNewLocalFile} from '@/features/documents/localArchiveStore';
import {storedFilePath} from '@/lib/supabase/storagePath';

const MAX_BYTES=50*1024*1024;
/** A separate verified copy; contract records and the cloud object are never changed. */
export async function copyContractPdfToDevice(input:{ownerId:string;projectId:string;contractId:string;expectedStored:string;root:FileSystemDirectoryHandle},signal:AbortSignal){
 if(![input.projectId,input.contractId].every(id=>/^[0-9a-f-]{36}$/i.test(id)))throw new Error('مرجع العقد غير صالح.');
 if(!navigator.locks)throw new Error('استخدم Chrome أو Edge حديثاً لحفظ النسخة.');
 return navigator.locks.request('baraq-contract-local-copy',{signal},async()=>{
  const client=await exportClient(input.ownerId,signal);
  const snapshot=async()=>{
   const result=await client.from('contracts').select('id,project_id,contract_name,pdf_url').eq('id',input.contractId).eq('project_id',input.projectId).abortSignal(signal).maybeSingle();
   if(result.error||!result.data?.pdf_url)throw new Error('تعذّر الوصول لملف العقد بصلاحيات حسابك.');
   if(storedFilePath('documents',result.data.pdf_url)!==storedFilePath('documents',input.expectedStored))throw new Error('تغير مرفق العقد؛ حدّث الصفحة ثم أعد النسخ.');
   return result.data;
  };
  const row=await snapshot(),path=storedFilePath('documents',row.pdf_url!);
  const version=async()=>{
   const result=await client.storage.from('documents').info(path),data=result.data;
   if(result.error||!data||typeof data.id!=='string'||typeof data.version!=='string'||!data.version||!Number.isSafeInteger(data.size)||data.size!<=0||data.size!>MAX_BYTES)throw new Error('تعذّر التحقق من نسخة المصدر أو تجاوزت 50 ميجابايت.');
   return {id:data.id,version:data.version,size:data.size!,etag:typeof data.etag==='string'?data.etag:null};
  };
  const before=await version(),signed=await client.storage.from('documents').createSignedUrl(path,600);
  if(signed.error||!signed.data?.signedUrl)throw new Error('تعذّر إنشاء رابط صالح لملف العقد.');
  const response=await fetch(signed.data.signedUrl,{signal,cache:'no-store'});
  if(!response.ok||!response.body){await response.body?.cancel().catch(()=>{});throw new Error('تعذّر تنزيل ملف العقد.');}
  const normalize=(tag:string)=>tag.trim().replace(/^W\//i,'').replace(/^"|"$/g,'');
  const tag=response.headers.get('etag');
  if(tag&&before.etag&&normalize(tag)!==normalize(before.etag)){await response.body.cancel();throw new Error('نسخة التنزيل لا تطابق المصدر.');}
  const reader=response.body.getReader(),chunks:Uint8Array<ArrayBuffer>[]=[];let bytes=0;
  try{while(true){signal.throwIfAborted();const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>before.size||bytes>MAX_BYTES)throw new Error('اختلف حجم تنزيل العقد عن المصدر.');chunks.push(new Uint8Array(next.value));}}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  if(bytes!==before.size)throw new Error('تنزيل العقد غير مكتمل؛ لم تُعتمد نسخة.');
  if(JSON.stringify(before)!==JSON.stringify(await version()))throw new Error('تغير المصدر أثناء التنزيل؛ أعد المحاولة.');
  await snapshot();await exportClient(input.ownerId,signal);signal.throwIfAborted();
  const folderPath=['العقود',input.contractId];await localFolder(input.root,folderPath,true);
  const name=safeExportName(row.contract_name.replace(/\.pdf$/i,''))+'-'+crypto.randomUUID()+'.pdf';
  const copied=await writeNewLocalFile(input.root,folderPath,new File(chunks,name,{type:'application/pdf'}),signal);
  await snapshot();if(JSON.stringify(before)!==JSON.stringify(await version()))throw new Error('تغير المصدر بعد النسخ؛ الملف المحلي باقٍ دون اعتماد إيصال.');
  await exportClient(input.ownerId,signal);
  const receipt={format:'baraq-contract-local-copy',version:1,projectId:input.projectId,contractId:input.contractId,name:row.contract_name,localPath:[...folderPath,name],bytes:copied.bytes,crc32:copied.crc32,sourceVersion:before,verifiedAt:new Date().toISOString(),sourceRetained:true};
  await writeNewLocalFile(input.root,folderPath,new File([JSON.stringify(receipt,null,2)],name+'.receipt.json',{type:'application/json'}),signal);
  return receipt;
 });
}
