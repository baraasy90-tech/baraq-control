export type LocalDirectory = FileSystemDirectoryHandle & {requestPermission(options:{mode:'readwrite'}):Promise<PermissionState>};
export async function localDestination(companyId:string,userId:string,handle?:FileSystemDirectoryHandle):Promise<LocalDirectory|null>{
 if(!companyId||!userId)throw new Error('الحساب غير متاح.');
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('baraq-local-destinations',1);request.onupgradeneeded=()=>request.result.createObjectStore('destinations');request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('destinations',handle?'readwrite':'readonly'),store=tx.objectStore('destinations'),key=JSON.stringify([companyId,userId]);let result:LocalDirectory|null=null;
 if(handle)store.put({handle,name:handle.name,savedAt:new Date().toISOString()},key);else{const request=store.get(key);request.onsuccess=()=>{const value=request.result?.handle;if(value?.kind==='directory')result=value;};}
 tx.oncomplete=()=>resolve(handle as LocalDirectory??result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });}finally{db.close();}
}
