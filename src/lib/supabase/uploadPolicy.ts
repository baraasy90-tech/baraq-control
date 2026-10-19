const images=['image/jpeg','image/png','image/webp'];
const typesByExtension:Record<string,string>={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',txt:'text/plain',csv:'text/csv',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',zip:'application/zip'};
export function validateUpload(bucket:'company-logos'|'signatures'|'checklist-photos'|'documents',file:Blob&{name?:string}):string {
 const maxMiB=bucket==='documents'?50:bucket==='checklist-photos'?10:bucket==='signatures'?2:5;
 if(file.size>maxMiB*1024*1024)throw new Error(`حجم الملف يتجاوز الحد المسموح (${maxMiB} ميجابايت)`);
 const extension=file.name?.split('.').pop()?.toLowerCase()??'';
 const type=file.type||typesByExtension[extension];
 if(bucket==='documents') {
  // Unknown/active formats are stored as downloads, never advertised as executable HTML/SVG.
  const passive=[...Object.values(typesByExtension),'application/x-zip-compressed','image/gif','image/bmp','image/tiff','video/mp4','video/webm','video/quicktime','audio/mpeg','audio/mp4','audio/wav','audio/ogg'];
  if(type==='text/html'||type==='image/svg+xml'||/javascript|xml/.test(type??'')&&!passive.includes(type??'')) return 'application/octet-stream';
  return type&&passive.includes(type)?type:'application/octet-stream';
 }
 const allowed=images;
 if(!type||!allowed.includes(type))throw new Error('نوع الملف غير مدعوم؛ استخدم PDF أو صورة أو مستنداً مكتبياً حسب الحقل');
 return type;
}
