import {useEffect,useRef,useState} from 'react';
import {useBeforeUnload} from 'react-router-dom';
import {Modal,SecondaryButton} from '@/components/ui';
import {useAuth} from '@/features/auth/AuthContext';
import {documentWorkspace} from '@/features/documents/documentWorkspace';

export function ContractLocalCopy({companyId,projectId,contractId,stored}:{companyId:string;projectId:string;contractId:string;stored:string}){
 const {user}=useAuth();
 const [destination,setDestination]=useState<FileSystemDirectoryHandle|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const controller=useRef<AbortController|null>(null),running=useRef(false),mounted=useRef(true),generation=useRef(0);
 useEffect(()=>{mounted.current=true;generation.current++;setDestination(null);setError('');setMessage('');setBusy(false);return()=>{mounted.current=false;generation.current++;controller.current?.abort();};},[user?.id,projectId,contractId,stored]);
 useBeforeUnload(event=>{if(running.current){event.preventDefault();event.returnValue='';}});
 const choose=async()=>{if(!user||running.current)return;setError('');setMessage('');const turn=generation.current;try{const workspace=await documentWorkspace(companyId,user.id,projectId);if(!workspace.directory)throw new Error('اختر مجلد المشروع من صفحة المستندات أولاً، ثم أعد المحاولة.');if(mounted.current&&turn===generation.current)setDestination(workspace.directory);}catch(caught){if(mounted.current&&turn===generation.current)setError(caught instanceof Error?caught.message:'تعذّر تحميل مجلد المشروع.');}};
 const copy=async()=>{
  if(!user||!destination||running.current)return;const turn=generation.current;running.current=true;setBusy(true);setError('');setMessage('');const signal=(controller.current=new AbortController()).signal;
  try{const permission=await(destination as FileSystemDirectoryHandle&{requestPermission:(options:{mode:'readwrite'})=>Promise<PermissionState>}).requestPermission({mode:'readwrite'});if(permission!=='granted')throw new Error('لم يُمنح إذن الكتابة؛ اختر السماح للمجلد ثم أعد المحاولة.');const {copyContractPdfToDevice}=await import('./localContractCopy');const receipt=await copyContractPdfToDevice({ownerId:user.id,projectId,contractId,expectedStored:stored,root:destination},signal);if(mounted.current&&turn===generation.current){setMessage('✓ تم حفظ PDF العقد والتحقق منه وإيصاله داخل '+destination.name+' / '+receipt.localPath.join(' / '));setDestination(null);}}
  catch(caught){if(mounted.current&&turn===generation.current)setError((caught instanceof Error?caught.message:'تعذّر نسخ العقد.')+' قد توجد نسخة محلية أو محاولة غير مكتملة؛ أعد المحاولة لإنشاء نسخة جديدة دون استبدال أي ملف.');}
  finally{running.current=false;if(mounted.current&&turn===generation.current)setBusy(false);}
 };
 return <div className="mb-4"><SecondaryButton disabled={!user||busy} onClick={()=>void choose()}>حفظ نسخة العقد في مجلد المشروع على الجهاز</SecondaryButton>{message&&<p role="status" className="text-xs text-green-700 break-all my-2">{message}</p>}{error&&!destination&&<p role="alert" className="text-xs text-critical my-2">{error}</p>}{destination&&<Modal title="حفظ نسخة موثّقة من العقد" onClose={()=>{if(!busy)setDestination(null);}}><p className="text-sm mb-3">الوجهة: {destination.name} ← العقود. تُحفظ نسخة PDF باسم جديد مع إيصال تحقق. تبقى النسخة السحابية ومشاركتها مع فريق المشروع كما هي.</p><SecondaryButton disabled={busy} onClick={()=>void copy()}>تأكيد حفظ نسخة العقد محلياً</SecondaryButton>{busy?<SecondaryButton onClick={()=>controller.current?.abort()}>إيقاف نسخ العقد</SecondaryButton>:<SecondaryButton onClick={()=>setDestination(null)}>إلغاء</SecondaryButton>}{busy&&<p role="status" className="text-xs my-2">جارٍ تنزيل العقد والتحقق من النسخة...</p>}{error&&<p role="alert" className="text-xs text-critical my-2">{error}</p>}</Modal>}</div>;
}
