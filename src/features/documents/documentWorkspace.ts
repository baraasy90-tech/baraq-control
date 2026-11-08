export interface DocumentWorkspace {mode:'cloud'|'device';directory:FileSystemDirectoryHandle|null}
export async function documentWorkspace(companyId:string,userId:string,projectId:string,value?:DocumentWorkspace):Promise<DocumentWorkspace>{
 if(!companyId||!userId||!projectId)throw new Error('تعذّر تحديد حساب المشروع.');
 if(value&&(!['cloud','device'].includes(value.mode)||value.mode==='device'&&value.directory?.kind!=='directory'))throw new Error('وجهة المستندات غير صالحة؛ لم يُحفظ الاختيار.');
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('baraq-document-workspaces',1);request.onupgradeneeded=()=>request.result.createObjectStore('workspaces');request.onerror=()=>reject(new Error('تعذّر فتح إعداد وجهة المستندات على الجهاز.'));request.onsuccess=()=>resolve(request.result);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('workspaces',value?'readwrite':'readonly'),store=tx.objectStore('workspaces'),key=JSON.stringify([companyId,userId,projectId]);let result:DocumentWorkspace={mode:'cloud',directory:null},invalid=false;
 if(value){store.put(value,key);result=value;}else{const request=store.get(key);request.onsuccess=()=>{const saved=request.result;if(saved===undefined)return;if(!saved||!['cloud','device'].includes(saved.mode)||saved.directory!==null&&saved.directory?.kind!=='directory'||saved.mode==='device'&&!saved.directory){invalid=true;return;}result=saved;};}
 tx.oncomplete=()=>invalid?reject(new Error('إعداد الوجهة غير صالح؛ اختر الوجهة من جديد قبل إضافة ملفات.')):resolve(result);tx.onerror=()=>reject(new Error('تعذّر حفظ إعداد وجهة المستندات.'));tx.onabort=()=>reject(new Error('لم يُحفظ اختيار الوجهة.'));
 });}finally{db.close();}
}
