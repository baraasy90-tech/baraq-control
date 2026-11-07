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
