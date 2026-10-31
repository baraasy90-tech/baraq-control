import {localDestination} from "@/features/documents/localDestination";
import {useAuth} from "@/features/auth/AuthContext";
import {useEffect,useState} from 'react';
import {SecondaryButton} from '@/components/ui';
export function LocalArchiveDestination({companyId}:{companyId:string}) {
 const {user}=useAuth(); const userId=user?.id;
 const [selected,setSelected]=useState<FileSystemDirectoryHandle|null>(null),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let current=true;setSelected(null);setMessage('');if(userId)void localDestination(companyId,userId).then(handle=>{if(current&&handle){setSelected(handle);setMessage('وجهة محفوظة على هذا المتصفح: '+handle.name);}}).catch(()=>{if(current)setError('تعذّر قراءة الوجهة المحفوظة. يمكنك اختيار المجلد من جديد.');});return()=>{current=false;};},[companyId,userId]);
 const choose=async()=>{
  setError('');setMessage('');
  const picker=(window as unknown as {showDirectoryPicker?:(options:{mode:'readwrite'})=>Promise<FileSystemDirectoryHandle>}).showDirectoryPicker;
  if(!picker){setError('اختيار مجلد الجهاز يحتاج متصفحاً يدعم الكتابة إلى المجلدات، مثل Chrome أو Edge على الكمبيوتر.');return;}
  try{setSelected(await picker.call(window,{mode:'readwrite'}));}catch(caught){if(!(caught instanceof DOMException&&caught.name==='AbortError'))setError('تعذّر اختيار المجلد. تحقق من صلاحية الوصول.');}
 };
 const save=async()=>{
  if(!selected||busy||!user)return;setBusy(true);setError('');setMessage('');
  try{
   await localDestination(companyId,user.id,selected);
   setMessage('تم حفظ وجهة النسخ على هذا المتصفح: '+selected.name);
  }catch{setError('تعذّر حفظ الوجهة محلياً. تحقق من السماح بتخزين بيانات الموقع وعدم استخدام وضع التصفح الخاص.');}
  finally{setBusy(false);}
 };
 return <section aria-label="وجهة النسخ على الجهاز" className="border border-line rounded-lg p-3 my-4">
  <h3 className="text-sm font-bold">وجهة النسخ على هذا الجهاز</h3>
  <p className="text-xs text-ink-soft my-2">تُحفظ الوجهة محلياً في هذا المتصفح. لا يغيّر ذلك التخزين السحابي ولا ينقل الملفات تلقائياً. قد يطلب المتصفح تجديد إذن الوصول لاحقاً.</p>
  <div className="flex flex-wrap gap-2"><SecondaryButton type="button" disabled={busy} onClick={()=>void choose()}>اختيار مجلد النسخ</SecondaryButton><SecondaryButton type="button" disabled={!selected||busy||!user} onClick={()=>void save()}>{busy?'جارٍ حفظ الوجهة...':'حفظ وجهة النسخ'}</SecondaryButton></div>
  {selected&&<p className="text-xs mt-2 break-all">المجلد المختار: {selected.name}</p>}{message&&<p role="status" className="text-xs text-green-700 mt-2">{message}</p>}{error&&<p role="alert" className="text-xs text-critical mt-2">{error}</p>}
 </section>;
}
