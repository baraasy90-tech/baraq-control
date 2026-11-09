import {checkDocumentText} from './contentText';
import {imageDimensions,MAX_OCR_BYTES,ocrImageName} from './ocrImagePolicy';
const assets='/ocr-assets/tesseract-7.0.0-data-1.0.0';
export interface ImageOcrResult {text:string;confidence:number}
/** Pinned tesseract.js 7 worker protocol; raw worker ownership permits cancellation during initialization. */
export async function recognizeLocalImage(file:File,signal:AbortSignal,progress:(percent:number)=>void):Promise<ImageOcrResult>{
 signal.throwIfAborted();if(!ocrImageName(file.name)||file.size>MAX_OCR_BYTES)throw new Error('OCR الحالي يدعم PNG وJPEG حتى 10 ميجابايت.');
 imageDimensions(new Uint8Array(await file.slice(0,256*1024).arrayBuffer()));signal.throwIfAborted();
 const image=new Uint8Array(await file.arrayBuffer()),timed=AbortSignal.any([signal,AbortSignal.timeout(120000)]),worker=new Worker(assets+'/worker.min.js');
 let pending:{id:string;resolve:(value:unknown)=>void;reject:(reason:unknown)=>void}|null=null,fatal:Error|null=null;
 const cancel=()=>{worker.terminate();pending?.reject(timed.reason);pending=null;};timed.addEventListener('abort',cancel,{once:true});
 worker.onerror=event=>{event.preventDefault();fatal=new Error('تعذّر تشغيل محرك OCR المحلي أو تحميل أصوله؛ أعد المحاولة.');pending?.reject(fatal);pending=null;};
 worker.onmessage=event=>{const message=event.data;if(message?.status==='progress'){if(message.data?.status==='recognizing text'&&Number.isFinite(message.data.progress))progress(Math.max(0,Math.min(100,Math.round(message.data.progress*100))));return;}if(!pending||message?.jobId!==pending.id)return;const current=pending;pending=null;if(message.status==='resolve')current.resolve(message.data);else{fatal=new Error('تعذّر استخراج نص الصورة محلياً؛ تحقق من سلامتها ووضوحها.');current.reject(fatal);}};
 const call=(action:string,payload:unknown)=>new Promise<unknown>((resolve,reject)=>{if(timed.aborted){reject(timed.reason);return;}if(fatal){reject(fatal);return;}const id=crypto.randomUUID();pending={id,resolve,reject};worker.postMessage({workerId:'baraq-local-ocr',jobId:id,action,payload});});
 try{
  timed.throwIfAborted();await call('load',{options:{lstmOnly:true,corePath:new URL(assets+'/core',location.origin).href,logging:false}});
  await call('loadLanguage',{langs:['ara','eng'],options:{langPath:new URL(assets+'/languages',location.origin).href,gzip:true,cacheMethod:'none',lstmOnly:true}});
  await call('initialize',{langs:'ara+eng',oem:1,config:{}});
  await call('setParameters',{params:{tessedit_pageseg_mode:3,user_defined_dpi:'300'}});
  const data=await call('recognize',{image,options:{rotateAuto:false},output:{text:true}}) as {text?:unknown;confidence?:unknown};
  timed.throwIfAborted();const recognized=typeof data.text==='string'?data.text:'';if(!recognized.trim())throw new Error('لم يتعرف المحرك على نص واضح في الصورة؛ استخدم صورة أوضح.');const text=checkDocumentText(recognized);return {text,confidence:typeof data.confidence==='number'&&Number.isFinite(data.confidence)?Math.max(0,Math.min(100,data.confidence)):0};
 }finally{timed.removeEventListener('abort',cancel);worker.terminate();pending=null;}
}
