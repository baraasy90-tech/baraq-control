import type {ImportEntry} from './importEntries';
import {localImportJobs,checkLocalImport,type LocalImportJob} from './localImport';
import {blobFingerprint} from './importVerification';
import {localFolder,writeNewLocalFile} from './localArchiveStore';
import {loadLocalCopy,createLocalCopy,saveLocalCopyJob,clearLocalCopy,type SavedLocalCopy,type SavedLocalJob,type LocalCopyScope} from './localCopyCheckpoint';
export function reattachLocalSources(saved:SavedLocalCopy,entries:ImportEntry[]):LocalImportJob[]{
 const selected=localImportJobs(entries),byPath=new Map(selected.map(entry=>[JSON.stringify(entry.path),entry]));
 if(byPath.size!==selected.length||selected.length!==saved.jobs.length)throw new Error('أعد اختيار الدفعة الأصلية كاملة بنفس مساراتها.');
 return saved.jobs.map(old=>{const entry=byPath.get(JSON.stringify(old.path));if(!entry||!!entry.file!==!!old.file||old.file&&(entry.file!.name!==old.file.name||entry.file!.size!==old.file.size||entry.file!.lastModified!==old.file.lastModified))throw new Error('اختلف المصدر عن سجل الدفعة؛ لم يبدأ الاستئناف.');return {...entry,id:old.id,status:'queued'};});
}
async function sourceDigest(job:LocalImportJob,signal:AbortSignal){
 const file=job.file!,digest=await blobFingerprint(file,signal);if(job.getCurrentFile){const current=await job.getCurrentFile(),fresh=await blobFingerprint(current,signal);if(current.size!==file.size||current.lastModified!==file.lastModified||fresh.bytes!==digest.bytes||fresh.crc32!==digest.crc32)throw new Error('تغير مصدر النسخ؛ لم تُعتمد الدفعة.');}return digest;
}
async function targetFile(root:FileSystemDirectoryHandle,base:string[],path:string[]){try{return await(await localFolder(root,[...base,...path.slice(0,-1)])).getFileHandle(path.at(-1)!);}catch(error){if(error instanceof DOMException&&error.name==='NotFoundError')return null;throw new Error('تعذر فحص مسار الوجهة أو اختلف نوع العنصر؛ لم يُستبدل الموجود.');}}
async function verifyTarget(handle:FileSystemFileHandle,expected:{bytes:number;crc32:string},signal:AbortSignal){const before=await handle.getFile(),digest=await blobFingerprint(before,signal),after=await handle.getFile();if(before.size!==after.size||before.lastModified!==after.lastModified||digest.bytes!==expected.bytes||digest.crc32!==expected.crc32)throw new Error('نسخة الوجهة مختلفة أو غير مكتملة؛ لم تُستبدل. اختر وجهة جديدة أو راجع الملفات.');}
export async function runResumableLocalCopy(scope:LocalCopyScope,root:FileSystemDirectoryHandle,base:string[],entries:ImportEntry[],signal:AbortSignal,changed:(jobs:LocalImportJob[],message:string)=>void,checkpoint:(saved:SavedLocalCopy|null)=>void){
 if(!navigator.locks)throw new Error('استئناف النسخ يحتاج Chrome أو Edge حديثاً.');
 await navigator.locks.request('baraq-local-import-write',{signal},async()=>{
  signal.throwIfAborted();let saved=await loadLocalCopy(scope);const resuming=!!saved;
  if(saved&&(!await root.isSameEntry(saved.root)||JSON.stringify(base)!==JSON.stringify(saved.base)))throw new Error('تختلف وجهة النسخ أو المجلد المفتوح عن سجل الدفعة؛ افتح الوجهة الأصلية للاستئناف.');
  const jobs=saved?reattachLocalSources(saved,entries):localImportJobs(entries);changed(jobs,'جارٍ فحص مصادر النسخ قبل الكتابة...');
  if(!saved)await checkLocalImport(root,base,jobs,signal);
  const metadata:SavedLocalJob[]=[],savedById=new Map(saved?.jobs.map(job=>[job.id,job])??[]);
  for(const [index,job]of jobs.entries()){
   signal.throwIfAborted();let fingerprint:SavedLocalJob['fingerprint'];if(job.file){fingerprint=await sourceDigest(job,signal);const old=savedById.get(job.id);if(old?.fingerprint&&(fingerprint.bytes!==old.fingerprint.bytes||fingerprint.crc32!==old.fingerprint.crc32))throw new Error('تغير محتوى المصدر عن سجل الدفعة ولو تشابه الحجم والتاريخ؛ لم يبدأ الاستئناف.');}
   metadata.push({id:job.id,path:[...job.path],file:job.file?{name:job.file.name,size:job.file.size,lastModified:job.file.lastModified}:undefined,fingerprint,status:saved?.jobs.find(old=>old.id===job.id)?.status??'queued'});changed(jobs,`فُحص ${index+1} من ${jobs.length} مصدر؛ لم تبدأ الكتابة بعد.`);
  }
  const byId=new Map(metadata.map(job=>[job.id,job])),existing=new Set<string>();
  for(const job of jobs){if(!job.file)continue;const handle=await targetFile(root,base,job.path);if(!handle)continue;const old=byId.get(job.id)!;if(!resuming||old.status==='queued')throw new Error('يوجد ملف وجهة لم يبدأه سجل الدفعة؛ لم تبدأ الكتابة ولم يُستبدل الموجود.');await verifyTarget(handle,old.fingerprint!,signal);existing.add(JSON.stringify(job.path));}
  await checkLocalImport(root,base,jobs,signal,existing);signal.throwIfAborted();
  if(!saved){saved=await createLocalCopy(scope,root,base,metadata);checkpoint(saved);}
  const batch=saved;
  for(const job of jobs){
   signal.throwIfAborted();const stored=metadata.find(old=>old.id===job.id)!;job.status='saving';changed(jobs,'جارٍ حفظ النسخ والتحقق منها...');
   try{
    if(job.file){const digest=await sourceDigest(job,signal);if(digest.bytes!==stored.fingerprint!.bytes||digest.crc32!==stored.fingerprint!.crc32)throw new Error('تغير المصدر قبل النسخ؛ توقف العمل وبقي الأصل محفوظاً.');}
    await saveLocalCopyJob(batch,{...stored,status:'saving'});signal.throwIfAborted();
    if(!job.file)await localFolder(root,[...base,...job.path],true);
    else{
     if(existing.has(JSON.stringify(job.path))){const handle=await targetFile(root,base,job.path);if(!handle)throw new Error('اختفت نسخة الوجهة منذ الفحص؛ افحص الدفعة مجدداً.');await verifyTarget(handle,stored.fingerprint!,signal);}
     else{await localFolder(root,[...base,...job.path.slice(0,-1)],true);const result=await writeNewLocalFile(root,[...base,...job.path.slice(0,-1)],job.file,signal);if(result.bytes!==stored.fingerprint!.bytes||result.crc32!==stored.fingerprint!.crc32)throw new Error('لم تتطابق النسخة مع بصمة المصدر؛ لا تعتمدها.');}
     const current=await sourceDigest(job,signal);if(current.bytes!==stored.fingerprint!.bytes||current.crc32!==stored.fingerprint!.crc32)throw new Error('تغير المصدر أثناء النسخ؛ لا تعتمد النسخة.');job.bytes=stored.fingerprint!.bytes;job.crc32=stored.fingerprint!.crc32;
    }
    await saveLocalCopyJob(batch,{...stored,status:'done'});job.status='done';changed(jobs,`تم حفظ ${jobs.filter(job=>job.file&&job.status==='done').length} من ${jobs.filter(job=>job.file).length} ملف والتحقق منه على الجهاز.`);
   }catch(error){job.status='error';job.error=error instanceof Error&&/[\u0600-\u06ff]/.test(error.message)?error.message:'أُوقفت الدفعة أو تعذّر حفظها؛ افحص نتيجة الملف الجاري ثم أعد اختيار المصدر كاملاً للاستئناف.';changed(jobs,job.error);throw new Error(job.error);}
  }
  await clearLocalCopy(scope,batch.id);checkpoint(null);
 });
}
