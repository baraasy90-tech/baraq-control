import {exportClient} from '@/features/documents/archiveExport';
import {localFolder,writeNewLocalFile} from '@/features/documents/localArchiveStore';
import {copyVerifiedCloudFile} from '@/features/documents/verifiedCloudCopy';
import {receivingPhotoExtension,receivingPhotoPaths} from './receivingPhotoPlan';
export interface ReceivingCopyJob {path:string;status:'waiting'|'copying'|'done'|'error';error?:string;localName?:string}

export async function copyReceivingImages(input:{ownerId:string;projectId:string;activityId:string;submissionId:string;expectedPaths:string[];root:FileSystemDirectoryHandle},signal:AbortSignal,changed:(jobs:ReceivingCopyJob[])=>void){
 if(!navigator.locks)throw new Error('استخدم Chrome أو Edge حديثاً لنسخ الصور.');
 return navigator.locks.request('baraq-receiving-local-copy',{signal},async()=>{
  const client=await exportClient(input.ownerId,signal);
  let description:{activityName:string;managerName:string;submittedAt:string}|undefined;
  const snapshot=async()=>{
   const activity=await client.from('activities').select('id,project_id,name').eq('id',input.activityId).eq('project_id',input.projectId).abortSignal(signal).maybeSingle();
   const submission=await client.from('submissions').select('id,activity_id,manager_name,created_at').eq('id',input.submissionId).eq('activity_id',input.activityId).abortSignal(signal).maybeSingle();
   if(activity.error||!activity.data||submission.error||!submission.data)throw new Error('تعذّر الوصول لتقديم الاستلام بصلاحيات حسابك.');
   const [checks,images]=await Promise.all([
    client.from('checklist_results').select('id,image_url').eq('submission_id',input.submissionId).order('id').limit(1001).abortSignal(signal),
    client.from('submission_images').select('id,image_url').eq('submission_id',input.submissionId).order('id').limit(101).abortSignal(signal),
   ]);
   if(checks.error||images.error||!checks.data||!images.data||checks.data.length>1000||images.data.length>100)throw new Error('تعذّر تحميل قائمة الصور كاملة ضمن حدود النسخ.');
   const paths=receivingPhotoPaths([...checks.data.map(row=>row.image_url),...images.data.map(row=>row.image_url)]);
   if(!paths.length)throw new Error('لا توجد صور لنسخها في هذا التقديم.');
   if(JSON.stringify(paths)!==JSON.stringify(receivingPhotoPaths(input.expectedPaths)))throw new Error('تغيرت صور التقديم؛ حدّث الصفحة ثم أعد النسخ.');
   description={activityName:activity.data.name,managerName:submission.data.manager_name,submittedAt:submission.data.created_at};
   return paths;
  };
  const paths=await snapshot(),folderPath=['الاستلام',input.submissionId,'نسخة-'+crypto.randomUUID()];
  await localFolder(input.root,folderPath,true);
  const jobs:ReceivingCopyJob[]=paths.map(path=>({path,status:'waiting'}));
  const report=()=>changed(jobs.map(job=>({...job})));
  const receipts:{sourcePath:string;localName:string;bytes:number;crc32:string;sourceVersion:{id:string;version:string;size:number;etag:string|null}}[]=[];
  report();
  for(const [index,job] of jobs.entries()){
   signal.throwIfAborted();job.status='copying';report();
   try{
    const extension=receivingPhotoExtension(job.path),name=String(index+1).padStart(3,'0')+'-'+crypto.randomUUID()+'.'+extension;
    job.localName=name;
    const copied=await copyVerifiedCloudFile(client,{bucket:'checklist-photos',path:job.path,maxBytes:10*1024*1024,root:input.root,folderPath,name,type:'application/octet-stream'},signal,async()=>{await snapshot();await exportClient(input.ownerId,signal);});
    const receipt={format:'baraq-receiving-image-copy',version:1,projectId:input.projectId,activityId:input.activityId,submissionId:input.submissionId,sourcePath:job.path,localName:name,...copied,verifiedAt:new Date().toISOString(),sourceRetained:true};
    await writeNewLocalFile(input.root,folderPath,new File([JSON.stringify(receipt,null,2)],name+'.receipt.json',{type:'application/json'}),signal);
    receipts.push({sourcePath:job.path,localName:name,...copied});job.localName=name;job.status='done';
   }catch(caught){job.status='error';job.error=signal.aborted?'أُوقف النسخ؛ الصور المكتملة باقية.':caught instanceof Error?caught.message:'تعذّر نسخ الصورة.';report();if(signal.aborted)signal.throwIfAborted();continue;}
   report();
  }
  await snapshot();await exportClient(input.ownerId,signal);
  for(const receipt of receipts){
   const result=await client.storage.from('checklist-photos').info(receipt.sourcePath),data=result.data;
   if(result.error||!data||JSON.stringify({id:data.id,version:data.version,size:data.size,etag:typeof data.etag==='string'?data.etag:null})!==JSON.stringify(receipt.sourceVersion)){
    const job=jobs.find(job=>job.path===receipt.sourcePath)!;job.status='error';job.error='تغير المصدر بعد نسخ الصورة؛ احتُفظ بالنسخة السابقة.';
   }
  }
  await snapshot();await exportClient(input.ownerId,signal);report();signal.throwIfAborted();const complete=jobs.every(job=>job.status==='done');
  const manifest={format:'baraq-receiving-images-copy',version:1,projectId:input.projectId,activityId:input.activityId,submissionId:input.submissionId,verifiedAt:new Date().toISOString(),sourceRetained:true,description,complete,jobs,receipts};
  await writeNewLocalFile(input.root,folderPath,new File([JSON.stringify(manifest,null,2)],'نتيجة-نسخ-الصور.json',{type:'application/json'}),signal);
  return {complete,folderPath,jobs};
 });
}
