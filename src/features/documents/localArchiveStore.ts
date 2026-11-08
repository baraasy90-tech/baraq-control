import {finishCrc32,updateCrc32} from './archiveExportPlan';
export function validateLocalSegment(name:string):string {
 if(!name||name==='.'||name==='..'||/[\\/\u0000-\u001f]/.test(name)||name.endsWith(' ')||name.endsWith('.'))throw new Error('اسم الملف أو المجلد غير صالح.');
 return name;
}
export async function localFolder(root:FileSystemDirectoryHandle,path:string[],create=false):Promise<FileSystemDirectoryHandle>{
 let current=root;for(const name of path)current=await current.getDirectoryHandle(validateLocalSegment(name),{create});return current;
}
export async function listLocalFolder(root:FileSystemDirectoryHandle,path:string[]){
 const folder=await localFolder(root,path),items:{name:string;kind:'file'|'directory'}[]=[];
 for await(const entry of (folder as unknown as {values():AsyncIterable<FileSystemHandle>}).values()) {
  if(items.length>=10000)throw new Error('المجلد كبير؛ افتح مجلدات أصغر. لم تُعرض قائمة جزئية.');
  items.push({name:entry.name,kind:entry.kind});
 }
 return items.sort((a,b)=>a.kind===b.kind?a.name.localeCompare(b.name,'ar'):a.kind==='directory'?-1:1);
}
async function entryExists(folder:FileSystemDirectoryHandle,name:string):Promise<boolean>{
 try{await folder.getFileHandle(name);return true;}catch(error){if(error instanceof DOMException&&error.name==='NotFoundError')return false;if(error instanceof DOMException&&error.name==='TypeMismatchError')return true;throw error;}
}
async function digestStream(stream:ReadableStream<Uint8Array>,signal:AbortSignal){
 const reader=stream.getReader();let bytes=0,state=0xffffffff;
 try{while(true){signal.throwIfAborted();const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;state=updateCrc32(state,next.value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 return {bytes,crc32:finishCrc32(state)};
}
/** New files only. Replacing an existing file needs a separate verified versioning operation. */
export async function writeNewLocalFile(root:FileSystemDirectoryHandle,path:string[],file:File,signal:AbortSignal){
 validateLocalSegment(file.name);signal.throwIfAborted();const folder=await localFolder(root,path);
 if(await entryExists(folder,file.name))throw new Error('يوجد عنصر بالاسم نفسه. لم نستبدله؛ اختر اسماً آخر.');
 const handle=await folder.getFileHandle(file.name,{create:true}),writer=await handle.createWritable(),reader=file.stream().getReader();let bytes=0,state=0xffffffff;
 try{while(true){signal.throwIfAborted();const chunk=await reader.read();if(chunk.done)break;await writer.write(chunk.value as Uint8Array<ArrayBuffer>);bytes+=chunk.value.byteLength;state=updateCrc32(state,chunk.value);}await writer.close();}
 catch(error){await writer.abort().catch(()=>{});throw error;}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const verified=await digestStream((await handle.getFile()).stream(),signal);
 if(verified.bytes!==bytes||verified.crc32!==finishCrc32(state))throw new Error('لم يتطابق الملف المحفوظ؛ لا تعتمد النسخة قبل التحقق.');
 return {handle,...verified};
}
export async function createLocalFolder(root:FileSystemDirectoryHandle,path:string[],name:string){
 validateLocalSegment(name);const parent=await localFolder(root,path);if(await entryExists(parent,name))throw new Error('يوجد عنصر بالاسم نفسه.');return parent.getDirectoryHandle(name,{create:true});
}
/** Verified copy between local folders. The source is always retained. */
export async function copyLocalFile(sourceRoot:FileSystemDirectoryHandle,sourcePath:string[],name:string,targetRoot:FileSystemDirectoryHandle,targetPath:string[],signal:AbortSignal){
 validateLocalSegment(name);const sourceFolder=await localFolder(sourceRoot,sourcePath),sourceHandle=await sourceFolder.getFileHandle(name),before=await sourceHandle.getFile();
 const targetFolder=await localFolder(targetRoot,targetPath);let targetAlreadyPresent=false;let result:{bytes:number;crc32:string};
 if(await entryExists(targetFolder,name)){
  const existing=await targetFolder.getFileHandle(name);if(await existing.isSameEntry(sourceHandle))throw new Error('المصدر والوجهة هما الملف نفسه.');
  const sourceDigest=await digestStream(before.stream(),signal),targetDigest=await digestStream((await existing.getFile()).stream(),signal);
  if(sourceDigest.bytes!==targetDigest.bytes||sourceDigest.crc32!==targetDigest.crc32)throw new Error('يوجد ملف مختلف بالاسم نفسه؛ لم يتم استبداله.');
  result=targetDigest;targetAlreadyPresent=true;
 }else result=await writeNewLocalFile(targetRoot,targetPath,before,signal);
 const after=await sourceHandle.getFile(),current=await digestStream(after.stream(),signal);
 if(after.size!==before.size||after.lastModified!==before.lastModified||current.bytes!==result.bytes||current.crc32!==result.crc32)throw new Error('تغير المصدر أثناء النسخ؛ الأصل محفوظ ولا تعتمد هذه النسخة كنسخة نهائية.');
 const receipt={format:'baraq-local-copy',version:1,sourcePath:[...sourcePath,name],targetPath:[...targetPath,name],bytes:result.bytes,crc32:result.crc32,verifiedAt:new Date().toISOString(),sourceRetained:true,targetAlreadyPresent};
 const report=new File([JSON.stringify(receipt,null,2)],'baraq-copy-'+crypto.randomUUID()+'.json',{type:'application/json'});
 try{await writeNewLocalFile(targetRoot,targetPath,report,signal);}catch{throw new Error('تم التحقق من ملف الوجهة، لكن تعذّر حفظ تقرير النسخ. الأصل محفوظ؛ يمكنك إعادة المحاولة دون استبدال ملف الوجهة.');}
 return receipt;
}
/** Save As deliberately retains the original; it is not a destructive rename. */
export async function saveLocalFileAs(root:FileSystemDirectoryHandle,path:string[],sourceName:string,newName:string,signal:AbortSignal){
 validateLocalSegment(sourceName);validateLocalSegment(newName);
 if(sourceName.normalize('NFKC').toLowerCase()===newName.normalize('NFKC').toLowerCase())throw new Error('اختر اسماً مختلفاً للنسخة الجديدة.');
 const folder=await localFolder(root,path),source=await folder.getFileHandle(sourceName),before=await source.getFile();
 const result=await writeNewLocalFile(root,path,new File([before],newName,{type:before.type,lastModified:before.lastModified}),signal);
 const current=await source.getFile(),check=await digestStream(current.stream(),signal);
 if(current.lastModified!==before.lastModified||check.bytes!==result.bytes||check.crc32!==result.crc32)throw new Error('تغير المصدر أثناء الحفظ؛ الأصل محفوظ لكن يلزم إعادة التحقق من النسخة الجديدة.');
 return {name:newName,sourceRetained:true,...check};
}
export interface LocalRecoveryPoint {id:string;name:string;path:string[];bytes:number;crc32:string;createdAt:string}
const recoveryPrefix='.baraq-recovery-';
export async function createLocalRecovery(root:FileSystemDirectoryHandle,path:string[],name:string,signal:AbortSignal):Promise<LocalRecoveryPoint>{
 const folder=await localFolder(root,path),handle=await folder.getFileHandle(validateLocalSegment(name)),source=await handle.getFile(),id=recoveryPrefix+crypto.randomUUID();
 const destination=await root.getDirectoryHandle(id,{create:true}),copied=await writeNewLocalFile(destination,[],new File([source],'payload.bin',{type:source.type}),signal),current=await handle.getFile(),check=await digestStream(current.stream(),signal);
 if(current.lastModified!==source.lastModified||check.bytes!==copied.bytes||check.crc32!==copied.crc32)throw new Error('تغير المصدر؛ لم تُعتمد نقطة الاستعادة.');
 const point:LocalRecoveryPoint={id,name,path:[...path],bytes:copied.bytes,crc32:copied.crc32,createdAt:new Date().toISOString()};
 await writeNewLocalFile(destination,[],new File([JSON.stringify(point)],'recovery.json',{type:'application/json'}),signal);return point;
}
export async function listLocalRecovery(root:FileSystemDirectoryHandle):Promise<LocalRecoveryPoint[]>{
 const result:LocalRecoveryPoint[]=[];
 for await(const entry of (root as unknown as {values():AsyncIterable<FileSystemHandle>}).values()){
  if(entry.kind!=='directory'||!/^\.baraq-recovery-[0-9a-f-]{36}$/.test(entry.name))continue;
  if(result.length>=200)throw new Error('قائمة نقاط الاستعادة كبيرة؛ يلزم تنظيمها قبل عرضها كاملة.');
  try{const dir=await root.getDirectoryHandle(entry.name),file=await(await dir.getFileHandle('recovery.json')).getFile();if(file.size>65536)continue;const point=JSON.parse(await file.text()) as LocalRecoveryPoint;
   if(point.id!==entry.name||typeof point.createdAt!=='string'||point.createdAt.length>40||!Number.isFinite(Date.parse(point.createdAt))||!Array.isArray(point.path)||point.path.length>32||typeof point.name!=='string'||!Number.isSafeInteger(point.bytes)||point.bytes<0||!/^[0-9a-f]{8}$/.test(point.crc32))continue;
   validateLocalSegment(point.name);point.path.forEach(validateLocalSegment);result.push(point);
  }catch(error){if(error instanceof DOMException&&["NotAllowedError","SecurityError","NotReadableError","AbortError"].includes(error.name))throw error;continue;}
 }
 return result.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
}
export async function restoreLocalRecovery(root:FileSystemDirectoryHandle,point:LocalRecoveryPoint,newName:string,signal:AbortSignal){
 if(!/^\.baraq-recovery-[0-9a-f-]{36}$/.test(point.id)||point.path.length>32)throw new Error('نقطة الاستعادة غير صالحة.');
 const folder=await root.getDirectoryHandle(point.id),file=await(await folder.getFileHandle('payload.bin')).getFile(),digest=await digestStream(file.stream(),signal);
 if(digest.bytes!==point.bytes||digest.crc32!==point.crc32)throw new Error('لم يتطابق محتوى نقطة الاستعادة؛ لم تُستعد نسخة.');
 await localFolder(root,point.path,true);return writeNewLocalFile(root,point.path,new File([file],validateLocalSegment(newName),{type:file.type}),signal);
}
