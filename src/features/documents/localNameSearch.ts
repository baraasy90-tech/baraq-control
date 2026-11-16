export interface LocalNameHit {path:string[];name:string;kind:'file'|'directory'}
export interface LocalNameSearch {hits:LocalNameHit[];scanned:number;complete:boolean;reason?:'stopped'|'entries'|'results'|'depth'|'time'|'unreadable'}
const key=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('ar');
/** Names only: no file bytes, network, or writes. Bounds keep large trees explicit and responsive. */
export async function searchLocalNames(root:FileSystemDirectoryHandle,query:string,signal:AbortSignal,progress:(scanned:number)=>void=()=>{}):Promise<LocalNameSearch>{
 const needle=key(query.trim());if(needle.length<2||needle.length>200)throw new Error('اكتب من حرفين إلى 200 حرف للبحث باسم الملف.');
 const result:LocalNameSearch={hits:[],scanned:0,complete:true},started=performance.now(),pending=[{folder:root,path:[] as string[]}];
 const stop=(reason:NonNullable<LocalNameSearch['reason']>)=>({...result,complete:false,reason});
 while(pending.length){
  if(signal.aborted)return stop('stopped');if(performance.now()-started>10000)return stop('time');
  const {folder,path}=pending.pop()!;
  try{for await(const entry of(folder as unknown as {values():AsyncIterable<FileSystemHandle>}).values()){
   if(signal.aborted)return stop('stopped');if(result.scanned>=5000)return stop('entries');if(performance.now()-started>10000)return stop('time');
   result.scanned++;if(result.scanned%100===0)progress(result.scanned);if(entry.name.startsWith('.baraq-'))continue;
   if(key(entry.name).includes(needle)){result.hits.push({path:[...path],name:entry.name,kind:entry.kind});if(result.hits.length>=100)return stop('results');}
   if(entry.kind==='directory'){
    if(path.length>=32){result.complete=false;result.reason??='depth';continue;}
    try{pending.push({folder:await folder.getDirectoryHandle(entry.name),path:[...path,entry.name]});}
    catch{if(signal.aborted)return stop('stopped');result.complete=false;result.reason??='unreadable';}
   }
  }}catch{if(signal.aborted)return stop('stopped');result.complete=false;result.reason??='unreadable';}
 }
 return result;
}
