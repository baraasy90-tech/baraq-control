import {checkDocumentText} from './contentText';
export function validReviewedPdfPages(pages:unknown):pages is number[]{
 return Array.isArray(pages)&&pages.length>0&&pages.length<=100&&pages.every((page,index)=>Number.isSafeInteger(page)&&page>=1&&page<=100&&(index===0||page>pages[index-1]));
}
export function mergeReviewedPdfText(previous:string,previousPages:number[],current:string,currentPages:number[]){
 if(!validReviewedPdfPages(previousPages)||!validReviewedPdfPages(currentPages))throw new Error('صفحات النص المراجع غير صالحة.');
 if(currentPages.some(page=>previousPages.includes(page)))throw new Error('تتداخل الصفحات مع النص السابق؛ راجع النص الحالي واحفظه دون جمع لتجنب التكرار.');
 checkDocumentText(previous);checkDocumentText(current);
 return {text:checkDocumentText(previous+'\n\n[نص مراجع إضافي — الصفحات '+currentPages.join('، ')+']\n'+current),pages:[...previousPages,...currentPages].sort((a,b)=>a-b)};
}
