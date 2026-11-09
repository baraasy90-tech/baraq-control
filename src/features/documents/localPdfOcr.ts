import {checkDocumentText,MAX_CONTENT_BYTES} from './contentText';
import {createLocalPdfTask} from './localPdfRuntime';
import {recognizeLocalImage} from './localOcr';
import {pdfOcrPages,pdfOcrViewport} from './pdfOcrPolicy';
export async function recognizeLocalPdf(file:File,first:number,last:number,signal:AbortSignal,progress:(percent:number)=>void){
 signal.throwIfAborted();pdfOcrPages(first,last);if(!/\.pdf$/i.test(file.name)||file.size>MAX_CONTENT_BYTES)throw new Error('OCR يدعم PDF حتى 10 ميجابايت.');
 const timed=AbortSignal.any([signal,AbortSignal.timeout(180000)]),bytes=new Uint8Array(await file.arrayBuffer());timed.throwIfAborted();
 const {worker,task}=createLocalPdfTask(bytes,timed);let render:{cancel:()=>void}|null=null;
 const cancel=()=>{render?.cancel();void task.destroy().catch(()=>{});worker.destroy();};timed.addEventListener('abort',cancel,{once:true});
 try{
  timed.throwIfAborted();const pdf=await task.promise,pages=pdfOcrPages(first,last,pdf.numPages);let text='',confidence=0;
  for(const [index,number]of pages.entries()){
   timed.throwIfAborted();const page=await pdf.getPage(number),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:pdfOcrViewport(base.width,base.height)}),canvas=document.createElement('canvas');
   try{
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const context=canvas.getContext('2d');if(!context)throw new Error('تعذّر تهيئة صورة صفحة PDF.');
    const rendering=page.render({canvas,canvasContext:context,viewport,background:'rgb(255,255,255)'});render=rendering;await rendering.promise;render=null;timed.throwIfAborted();
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('تعذّر تحويل صفحة PDF للصورة.')),'image/png'));timed.throwIfAborted();
    const result=await recognizeLocalImage(new File([blob],'page.png',{type:'image/png'}),timed,percent=>progress(Math.round((index+percent/100)/pages.length*100)));
    text+=`[الصفحة ${number}]\n${result.text}\n`;checkDocumentText(text);confidence+=result.confidence;
   }finally{canvas.width=0;canvas.height=0;page.cleanup();}
  }
  timed.throwIfAborted();return {text:checkDocumentText(text),confidence:confidence/pages.length,pages};
 }catch(error){timed.throwIfAborted();if(error&&typeof error==='object'&&'name'in error&&error.name==='PasswordException')throw new Error('PDF محمي بكلمة مرور؛ استخدم نسخة متاحة لك.');if(error instanceof Error&&/[\u0600-\u06ff]/.test(error.message))throw error;throw new Error('تعذّر استخراج نص صفحات PDF؛ تحقق من سلامة الملف.');}
 finally{timed.removeEventListener('abort',cancel);await task.destroy().catch(()=>{});worker.destroy();}
}
