const images=['image/jpeg','image/png','image/webp'];
const typesByExtension:Record<string,string>={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',txt:'text/plain',csv:'text/csv',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',zip:'application/zip'};
export function validateUpload(bucket:'company-logos'|'signatures'|'checklist-photos'|'documents',file:Blob&{name?:string}):string {
 const maxMiB=bucket==='documents'?25:bucket==='checklist-photos'?10:bucket==='signatures'?2:5;
 if(file.size>maxMiB*1024*1024)throw new Error(`حجم الملف يتجاوز الحد المسموح (${maxMiB} ميجابايت)`);
 const extension=file.name?.split('.').pop()?.toLowerCase()??'';
 const type=file.type||typesByExtension[extension];
 const allowed=bucket==='documents'?[...new Set(Object.values(typesByExtension)),'application/x-zip-compressed']:images;
 if(!type||!allowed.includes(type))throw new Error('نوع الملف غير مدعوم؛ استخدم PDF أو صورة أو مستنداً مكتبياً حسب الحقل');
 return type;
}
