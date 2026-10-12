import {useState,type ReactNode} from 'react';
import {getFileUrl,type Bucket} from '@/lib/supabase/storage';

/** Obtain a fresh private link at the user's click, including for a cached expired URL. */
export function StorageFileLink({stored,bucket='documents',children,className}:{stored:string|null|undefined;bucket?:Bucket;children:ReactNode;className?:string}){
 const [pending,setPending]=useState(false),[error,setError]=useState('');
 const open=async()=>{
  if(!stored||pending)return;setPending(true);setError('');
  const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;
  try{const url=await getFileUrl(bucket,stored);if(!url)throw new Error('File unavailable');if(tab)tab.location.replace(url);else setError('اسمح بفتح نافذة الملف ثم حاول مجدداً');}
  catch{tab?.close();setError('تعذّر فتح الملف، حاول مجدداً');}
  finally{setPending(false);}
 };
 return <span className={className}><button type="button" disabled={!stored||pending} onClick={open} className="inline-flex items-center gap-1 border-none bg-transparent p-0 text-inherit [font:inherit] text-right cursor-pointer disabled:opacity-50">{children}</button>{error&&<span role="alert" className="block text-xs text-critical mt-1">{error}</span>}</span>;
}
