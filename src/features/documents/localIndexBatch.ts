import {contentFileKind} from './contentText';
export interface LocalIndexBatchItem {name:string;status:'waiting'|'indexing'|'done'|'error';error?:string}
/** A bounded sequential batch; originals are read only and each index commits independently. */
export async function runLocalIndexBatch(names:string[],signal:AbortSignal,index:(name:string)=>Promise<void>,changed:(items:LocalIndexBatchItem[])=>void){
 const unique=[...new Set(names)];
 if(!unique.length||unique.length>20||unique.some(name=>!contentFileKind(name)))throw new Error('اختر حتى 20 ملفاً نصياً أو PDF نصياً.');
 const items:LocalIndexBatchItem[]=unique.map(name=>({name,status:'waiting'}));
 const report=()=>changed(items.map(item=>({...item})));
 report();
 for(const item of items){
  signal.throwIfAborted();item.status='indexing';report();
  try{await index(item.name);item.status='done';}
  catch(error){item.status='error';item.error=signal.aborted?'أُوقفت الفهرسة؛ الملفات الأصلية محفوظة.':error instanceof Error?error.message:'تعذّرت فهرسة الملف.';report();if(signal.aborted)signal.throwIfAborted();continue;}
  report();
 }
 return items;
}
