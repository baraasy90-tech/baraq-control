import {runResumableLocalCopy} from './localCopyResume';
import {localFolder,writeNewLocalFile} from './localArchiveStore';
import type {LocalCopyScope,SavedLocalCopy} from './localCopyCheckpoint';
import type {LocalImportJob} from './localImport';

/** Copy-to has its own journal; receipt completion precedes journal cleanup. */
export async function resumeCopyToFolder(scope:LocalCopyScope,sourceRoot:FileSystemDirectoryHandle,sourcePath:string[],name:string,target:FileSystemDirectoryHandle,signal:AbortSignal,changed:(jobs:LocalImportJob[],message:string)=>void,checkpoint:(saved:SavedLocalCopy|null)=>void){
 const source=await(await localFolder(sourceRoot,sourcePath)).getFileHandle(name);
 try{const existing=await target.getFileHandle(name);if(await existing.isSameEntry(source))throw new Error('المصدر والوجهة هما الملف نفسه.');}catch(error){if(!(error instanceof DOMException&&error.name==='NotFoundError'))throw error;}
 const file=await source.getFile();
 await runResumableLocalCopy({...scope,operation:'copy-to'},target,[],[{path:[name],file,getCurrentFile:()=>source.getFile()}],signal,changed,checkpoint,{
  context:{kind:'copy-to',sourceRoot,sourcePath:[...sourcePath],sourceName:name},
  finalize:async(jobs,saved,currentSignal)=>{
   const job=jobs[0];if(jobs.length!==1||job.status!=='done'||job.bytes===undefined||!job.crc32)throw new Error('لم يكتمل تحقق ملف النسخ.');
   const receipt={format:'baraq-local-copy',version:1,batchId:saved.id,createdAt:saved.createdAt,sourcePath:[...sourcePath,name],targetPath:[name],bytes:job.bytes,crc32:job.crc32,sourceRetained:true};
   const prefix='.baraq-copy-receipt-'+saved.id+'-',text=JSON.stringify(receipt);let scanned=0,receipts=0;
   for await(const entry of(target as unknown as {values():AsyncIterable<FileSystemHandle>}).values()){
    currentSignal.throwIfAborted();if(++scanned>10000)throw new Error('وجهة الإيصال كبيرة جداً للفحص الكامل.');
    if(entry.kind!=='file'||!entry.name.startsWith(prefix))continue;if(++receipts>20)throw new Error('تجاوزت محاولات إيصال النسخ الحد؛ احتفظ بالملفات واختر وجهة جديدة.');
    const stored=await(await target.getFileHandle(entry.name)).getFile();if(stored.size<=65536&&await stored.text()===text)return;
   }
   await writeNewLocalFile(target,[],new File([text],prefix+crypto.randomUUID()+'.json',{type:'application/json'}),currentSignal);
  }
 });
}
