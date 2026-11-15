import {copyVerifiedCloudFile} from '@/features/documents/verifiedCloudCopy';
import {exportClient} from '@/features/documents/archiveExport';
import {safeExportName} from '@/features/documents/archiveExportPlan';
import {writeNewLocalFile} from '@/features/documents/localArchiveStore';
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
  const folderPath=['العقود',input.contractId],name=safeExportName(row.contract_name.replace(/\.pdf$/i,''))+'-'+crypto.randomUUID()+'.pdf';
  const copied=await copyVerifiedCloudFile(client,{bucket:'documents',path,maxBytes:MAX_BYTES,root:input.root,folderPath,name,type:'application/pdf'},signal,async()=>{await snapshot();await exportClient(input.ownerId,signal);});
  await exportClient(input.ownerId,signal);
  const receipt={format:'baraq-contract-local-copy',version:1,projectId:input.projectId,contractId:input.contractId,name:row.contract_name,localPath:[...folderPath,name],bytes:copied.bytes,crc32:copied.crc32,sourceVersion:copied.sourceVersion,verifiedAt:new Date().toISOString(),sourceRetained:true};
  await writeNewLocalFile(input.root,folderPath,new File([JSON.stringify(receipt,null,2)],name+'.receipt.json',{type:'application/json'}),signal);
  return receipt;
 });
}
