export const MAX_BODY_BYTES = 32768;
export async function readBoundedJson(req: Request): Promise<unknown> {
  if (!req.body) throw new Error("جسم الطلب مطلوب");
  const reader=req.body.getReader();
  const chunks:Uint8Array[]=[];let length=0;
  try {
    while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_BODY_BYTES){await reader.cancel();throw new Error("حجم الطلب أكبر من الحد المسموح");}chunks.push(value);}
  } finally {reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Error("صيغة الطلب غير صالحة");}
}
export function inviteToken(body:unknown):string {
  if(!body||typeof body!=="object"||!("token" in body)||typeof body.token!=="string"||! /^[A-Za-z0-9_-]{16,256}$/.test(body.token))throw new Error("رمز الدعوة غير صالح");
  return body.token;
}
export function supportMessages(body:unknown):{role:"user"|"assistant";content:string}[] {
  if(!body||typeof body!=="object"||!("message" in body)||typeof body.message!=="string"||!body.message.trim()||body.message.length>4000)throw new Error("الرسالة مطلوبة وبحد أقصى 4000 حرف");
  const history="history" in body?body.history:[];
  if(!Array.isArray(history)||history.length>10)throw new Error("سجل المحادثة غير صالح أو أطول من الحد المسموح");
  const messages=history.map(entry=>{
    if(!entry||typeof entry!=="object"||!["user","assistant"].includes(entry.role)||typeof entry.content!=="string"||!entry.content.trim()||entry.content.length>4000)throw new Error("عنصر غير صالح في سجل المحادثة");
    return {role:entry.role as "user"|"assistant",content:entry.content};
  });
  if(messages.reduce((sum,m)=>sum+m.content.length,body.message.length)>16000)throw new Error("المحادثة أطول من الحد المسموح");
  return [...messages,{role:"user",content:body.message}];
}
