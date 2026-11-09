export const MAX_PDF_OCR_PAGES=3,MAX_PDF_SOURCE_PAGES=100;
export function pdfOcrPages(first:number,last:number,total=MAX_PDF_SOURCE_PAGES){
 if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||!Number.isSafeInteger(total)||first<1||last<first||last>total||total>MAX_PDF_SOURCE_PAGES||last-first+1>MAX_PDF_OCR_PAGES)throw new Error('اختر من صفحة إلى 3 صفحات متتالية، داخل PDF لا يتجاوز 100 صفحة.');
 return Array.from({length:last-first+1},(_,i)=>first+i);
}
export function pdfOcrViewport(width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||width>20000||height>20000)throw new Error('أبعاد صفحة PDF غير مدعومة.');
 return Math.min(2,2400/Math.max(width,height),Math.sqrt(5000000/(width*height)));
}
