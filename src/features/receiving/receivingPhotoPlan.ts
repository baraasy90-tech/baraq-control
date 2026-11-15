import {storedFilePath} from '@/lib/supabase/storagePath';
export function receivingPhotoPaths(values:(string|null|undefined)[]){
 const paths=[...new Set(values.filter((value):value is string=>!!value).map(value=>storedFilePath('checklist-photos',value)))].sort();
 if(paths.length>100)throw new Error('النسخ يدعم حتى 100 صورة للتقديم الواحد.');
 return paths;
}
export function receivingPhotoExtension(path:string){
 const extension=path.split('.').at(-1)?.toLowerCase();
 return extension&&['png','jpg','jpeg','webp'].includes(extension)?extension:'bin';
}
