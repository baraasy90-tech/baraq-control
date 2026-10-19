export interface ImportEntry { path: string[]; file?: File }
export type PickedDirectory = {kind:'directory';name:string;values:()=>AsyncIterable<PickedDirectory|{kind:'file';name:string;getFile:()=>Promise<File>}>};
type Entry = { name: string; isFile: boolean; isDirectory: boolean; file: (ok: (file: File) => void, fail: (error: DOMException) => void) => void; createReader: () => {readEntries: (ok: (entries: Entry[]) => void, fail: (error: DOMException) => void) => void} };
export const MAX_IMPORT_ENTRIES = 5000;

export function validateImportPath(path: string[]) {
  if (!path.length || path.length > 64 || path.some(part => !part.trim() || part==='.' || part==='..' || part.length>255 || /[\\/]/.test(part) || Array.from(part).some(char => char.charCodeAt(0)<32))) throw new Error('مسار ملف أو مجلد غير صالح أو أعمق من 64 مستوى.');
}

export function pickedImportEntries(files: FileList | File[]): ImportEntry[] {
  if (files.length > MAX_IMPORT_ENTRIES) throw new Error('اختر حتى 5000 ملف في الدفعة الواحدة.');
  const folders=new Set<string>();
  const entries=Array.from(files).map(file => {
    const path = (file.webkitRelativePath || file.name).split('/');validateImportPath(path);return {path,file};
  });
  for(const entry of entries)for(let i=1;i<entry.path.length;i++)folders.add(JSON.stringify(entry.path.slice(0,i)));
  if(entries.length+folders.size>MAX_IMPORT_ENTRIES)throw new Error('اختر حتى 5000 ملف ومجلد في الدفعة الواحدة.');
  return entries;
}

export async function droppedImportEntries(items: DataTransferItemList, fallback: FileList): Promise<ImportEntry[]> {
  // Capture entries synchronously; browsers invalidate DataTransfer after the drop callback.
  const roots = Array.from(items).filter(item => item.kind==='file').map(item => ({entry:item.webkitGetAsEntry?.() as unknown as Entry|null,file:item.getAsFile()}));
  const result: ImportEntry[]=[];
  const add=(item:ImportEntry)=>{validateImportPath(item.path);if(result.length>=MAX_IMPORT_ENTRIES)throw new Error('اسحب حتى 5000 ملف ومجلد في الدفعة الواحدة.');result.push(item);};
  async function walk(entry:Entry,parent:string[]) {
    const path=[...parent,entry.name];validateImportPath(path);
    if(entry.isFile){const file=await new Promise<File>((resolve,reject)=>entry.file(resolve,reject));add({path,file});}
    else if(entry.isDirectory){add({path});const reader=entry.createReader();for(;;){const children=await new Promise<Entry[]>((resolve,reject)=>reader.readEntries(resolve,reject));if(!children.length)break;for(const child of children)await walk(child,path);}}
  }
  if(!roots.length)return pickedImportEntries(fallback);
  for(const root of roots){if(root.entry)await walk(root.entry,[]);else if(root.file)add({path:[root.file.name],file:root.file});}
  return result;
}

export async function directoryImportEntries(root:PickedDirectory):Promise<ImportEntry[]> {
  const result:ImportEntry[]=[];
  const add=(entry:ImportEntry)=>{validateImportPath(entry.path);if(result.length>=MAX_IMPORT_ENTRIES)throw new Error('اختر حتى 5000 ملف ومجلد في الدفعة الواحدة.');result.push(entry);};
  async function walk(directory:PickedDirectory,parent:string[]) {
    const path=[...parent,directory.name];add({path});
    for await(const child of directory.values()){
      if(child.kind==='directory')await walk(child,path);
      else add({path:[...path,child.name],file:await child.getFile()});
    }
  }
  await walk(root,[]);return result;
}
