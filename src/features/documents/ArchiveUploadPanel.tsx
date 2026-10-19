import { useEffect, useRef, useState } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FolderUp, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Modal, PrimaryButton, SecondaryButton, ErrorText } from '@/components/ui';
import { droppedImportEntries, pickedImportEntries, directoryImportEntries, type PickedDirectory, type ImportEntry } from './importEntries';
import { importJobs, runImportJobs, type ImportJob } from './importUpload';

export function ArchiveUploadPanel({projectId,folderId,readOnly,onBusyChange}:{projectId:string;folderId:string|null;readOnly:boolean;onBusyChange:(busy:boolean)=>void}) {
 const {user}=useAuth(),cache=useQueryClient();const filesRef=useRef<HTMLInputElement>(null),folderRef=useRef<HTMLInputElement>(null),stop=useRef(false),running=useRef(false);
 const [jobs,setJobs]=useState<ImportJob[]>([]),[busy,setBusy]=useState(false),[collecting,setCollecting]=useState(false),[error,setError]=useState(''),[dragging,setDragging]=useState(false);
 const mounted=useRef(true),reading=useRef(false),writable=useRef(!readOnly);writable.current=!readOnly;
 const destination=useRef<{projectId:string;folderId:string|null}|null>(null);
 const blocker=useBlocker(busy||collecting);
 useBeforeUnload(event=>{if(running.current||reading.current){event.preventDefault();event.returnValue='';}});
 useEffect(()=>{onBusyChange(busy||collecting);return()=>onBusyChange(false);},[busy,collecting,onBusyChange]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop.current=true;};},[]);
 useEffect(()=>{if(readOnly)stop.current=true;},[readOnly]);
 const refresh=async()=>{await Promise.all([cache.invalidateQueries({queryKey:['document-folders',projectId]}),cache.invalidateQueries({queryKey:['documents']}),cache.invalidateQueries({queryKey:['project-document-index',projectId]})]);};
 const execute=async(batch:ImportJob[])=>{
  if(!mounted.current||!writable.current||running.current||!user||!destination.current)return;
  running.current=true;stop.current=false;setBusy(true);setError('');
  try{await runImportJobs(batch,destination.current.projectId,destination.current.folderId,user.id,stop,()=>setJobs([...batch]));}
  catch(caught){setError(caught instanceof Error?caught.message:'تعذّر بدء الرفع.');}
  finally{running.current=false;setBusy(false);setJobs([...batch]);await refresh();}
 };
 const add=async(entries:ImportEntry[])=>{
  if(!mounted.current||!writable.current)return;
  if(running.current){setError('انتظر اكتمال الدفعة الجارية قبل إضافة دفعة أخرى.');return;}
  if(jobs.some(job=>job.status!=='done')){setError('استكمل الدفعة السابقة أو امسح قائمتها قبل إضافة دفعة جديدة.');return;}
  destination.current={projectId,folderId};const batch=importJobs(entries);setJobs(batch);await execute(batch);
 };
 const pick=(files:FileList|null)=>{if(!files)return;try{void add(pickedImportEntries(files));}catch(caught){setError(caught instanceof Error?caught.message:'تعذّر قراءة الملفات.');}};
 const chooseDirectory=async()=>{
  const picker=(window as unknown as {showDirectoryPicker?:(options:{mode:'read'})=>Promise<PickedDirectory>}).showDirectoryPicker;
  if(!picker){folderRef.current?.click();return;}
  if(readOnly||running.current||reading.current)return;
  reading.current=true;setCollecting(true);
  try{const directory=await picker.call(window,{mode:'read'});const entries=await directoryImportEntries(directory);reading.current=false;if(mounted.current)setCollecting(false);await add(entries);}
  catch(caught){if(mounted.current&&!(caught instanceof DOMException&&caught.name==='AbortError'))setError(caught instanceof Error&&/[\u0600-\u06ff]/.test(caught.message)?caught.message:'تعذّر قراءة المجلد. تحقق من صلاحية الوصول إليه.');}
  finally{reading.current=false;if(mounted.current)setCollecting(false);}
 };
 const done=jobs.filter(job=>job.status==='done').length,failed=jobs.filter(job=>job.status==='error').length;
 return <section aria-label="رفع الملفات والمجلدات" className={`rounded-xl border-2 border-dashed p-4 mb-4 transition ${dragging?'border-primary bg-primary-bg':'border-line bg-panel'}`}
  onDragEnter={event=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();setDragging(true);}}}
  onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect=readOnly||busy||collecting?'none':'copy';}}
  onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setDragging(false);}}
  onDrop={event=>{event.preventDefault();setDragging(false);if(readOnly||running.current||reading.current)return;reading.current=true;setCollecting(true);const entries=droppedImportEntries(event.dataTransfer.items,event.dataTransfer.files);void entries.then(found=>{reading.current=false;if(mounted.current)setCollecting(false);return add(found);}).catch(caught=>{if(mounted.current)setError(caught instanceof Error&&/[\u0600-\u06ff]/.test(caught.message)?caught.message:'تعذّر قراءة المجلد بالكامل. تحقق من صلاحية الوصول أو استخدم اختيار الملفات.');}).finally(()=>{reading.current=false;if(mounted.current)setCollecting(false);});}}>
  <p className="text-sm font-semibold mb-1 flex gap-2 items-center"><Upload size={18}/>اسحب الملفات أو المجلدات وأفلتها هنا</p>
  <p className="text-xs text-ink-soft mb-3">جميع الصيغ، بما فيها الفيديو وDWG وRevit وPrimavera والملفات المضغوطة؛ حتى 50 ميجابايت للملف. {folderId?'تُضاف داخل المجلد المفتوح مع الاحتفاظ بالتفرعات.':'تُضاف المجلدات بتفرعاتها، والملفات المفردة إلى «ملفات عامة» تلقائياً.'}</p>
  <div className="flex flex-wrap gap-2">
   <SecondaryButton disabled={readOnly||busy||collecting} onClick={()=>filesRef.current?.click()}>إضافة ملفات</SecondaryButton>
   <SecondaryButton disabled={readOnly||busy||collecting} onClick={()=>void chooseDirectory()}><FolderUp size={15} className="inline ml-1"/>إضافة مجلد من الجهاز</SecondaryButton>
   <input ref={filesRef} aria-label="اختيار ملفات للرفع" type="file" multiple disabled={readOnly||busy||collecting} className="hidden" onChange={event=>{pick(event.target.files);event.target.value='';}}/>
   <input ref={folderRef} aria-label="اختيار مجلد للرفع" type="file" multiple {...{webkitdirectory:''}} disabled={readOnly||busy||collecting} className="hidden" onChange={event=>{pick(event.target.files);event.target.value='';}}/>
  </div>
  <ErrorText>{error}</ErrorText>
  {collecting&&<p role="status" className="text-xs text-ink-soft mt-2">جارٍ قراءة المجلد وتفرعاته...</p>}
  {!!jobs.length&&<div className="mt-4" aria-label="قائمة الرفع">
   <p role="status" className="text-xs text-ink-soft">اكتمل {done} من {jobs.length} عنصر{failed?` — تعذّر ${failed}`:''}{busy?' — جارٍ الرفع، أبقِ الصفحة مفتوحة.':''}</p>
   <progress aria-label="تقدم دفعة الرفع" value={done} max={jobs.length} className="w-full h-2"/>
   <ul className="max-h-64 overflow-y-auto list-none m-0 p-0 mt-2 space-y-2">{jobs.map(job=><li key={job.id} className="text-xs border-b border-line py-2 break-words"><span className="font-medium">{job.path.join(' / ')}</span> — {job.status==='done'?<span aria-label={'تم الحفظ على الخادم: '+job.path.join(' / ')} className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={15} aria-hidden="true"/>تم الحفظ على الخادم</span>:job.status==='uploading'?'جارٍ الرفع':job.status==='error'?'تعذّر الرفع':'في الانتظار'}{job.error&&<p role="alert" className="text-critical mt-1">{job.error}</p>}</li>)}</ul>
   <div className="flex flex-wrap gap-2 mt-3">{busy?<SecondaryButton onClick={()=>{stop.current=true;}}>إيقاف بعد الملفات الجارية</SecondaryButton>:<>
    {jobs.some(job=>job.status!=='done')&&<SecondaryButton disabled={readOnly} onClick={()=>void execute(jobs)}>استكمال وإعادة محاولة المتعثر</SecondaryButton>}
    <SecondaryButton onClick={()=>{setJobs([]);setError('');destination.current=null;}}>مسح القائمة</SecondaryButton>
   </>}</div>
  </div>}
  {blocker.state==='blocked'&&<Modal title="عملية رفع جارية" onClose={()=>blocker.reset()}><p className="text-sm mb-4">انتظر اكتمال الدفعة أو أوقف الملفات المتبقية قبل مغادرة الصفحة، لتبقى نتيجة كل ملف واضحة.</p><PrimaryButton onClick={()=>blocker.reset()}>البقاء في الصفحة</PrimaryButton></Modal>}
 </section>;
}
