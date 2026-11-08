import {validateUpload} from '@/lib/supabase/uploadPolicy';
import {MAX_IMPORT_ENTRIES,validateImportPath,type ImportEntry} from './importEntries';
export interface ImportCopyPlan {files:number;folders:number;bytes:number;liveSources:number;snapshotSources:number}
/** Read-only preflight. Never changes names, merges conflicting paths or touches storage. */
export function planImportCopy(entries:ImportEntry[],destination:'cloud'|'device'='cloud'):ImportCopyPlan{
 if(!entries.length||entries.length>MAX_IMPORT_ENTRIES)throw new Error('اختر دفعة من عنصر واحد إلى 5000 عنصر.');
 const paths=new Map<string,{original:string;kind:'file'|'directory'}>();let files=0,bytes=0,liveSources=0;
 for(const entry of entries){
  validateImportPath(entry.path);if(entry.file&&destination==='cloud')validateUpload('documents',entry.file);
  if(entry.file&&entry.path.at(-1)!==entry.file.name)throw new Error('اسم الملف لا يطابق مساره؛ أعد اختياره قبل النسخ.');
  for(let depth=1;depth<=entry.path.length;depth++){
   const path=entry.path.slice(0,depth),original=JSON.stringify(path),key=JSON.stringify(path.map(name=>name.normalize('NFKC').trim().toLowerCase())),kind=depth===entry.path.length&&entry.file?'file':'directory',previous=paths.get(key);
   if(previous&&(previous.original!==original||previous.kind!==kind||kind==='file'))throw new Error('تعارض في مسارات الدفعة: '+path.join(' / ')+'؛ غيّر الاسم أو اختر دفعات منفصلة. لم يبدأ النسخ.');
   paths.set(key,{original,kind});
   if(paths.size>MAX_IMPORT_ENTRIES)throw new Error('الدفعة مع المجلدات الحاوية تتجاوز 5000 عنصر.');
  }
  if(entry.file){files++;bytes+=entry.file.size;if(!Number.isSafeInteger(bytes)||bytes<0)throw new Error('حجم الدفعة غير صالح.');if(entry.getCurrentFile)liveSources++;}
 }
 return {files,folders:[...paths.values()].filter(item=>item.kind==='directory').length,bytes,liveSources,snapshotSources:files-liveSources};
}
