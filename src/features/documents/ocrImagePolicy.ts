export const MAX_OCR_BYTES=10*1024*1024,MAX_OCR_PIXELS=6000000;
export function ocrImageName(name:string){return /\.(png|jpe?g)$/i.test(name);}
export function imageDimensions(bytes:Uint8Array):{width:number;height:number}{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width=0,height=0;
 if(bytes.length>=24&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)&&view.getUint32(8)===13&&view.getUint32(12)===0x49484452){width=view.getUint32(16);height=view.getUint32(20);}
 else if(bytes[0]===255&&bytes[1]===216){let offset=2;while(offset+3<bytes.length){if(bytes[offset++]!==255)break;while(bytes[offset]===255)offset++;const marker=bytes[offset++];if(marker===0xd9||marker===0xda)break;if(marker===0x01||marker>=0xd0&&marker<=0xd8)continue;if(offset+2>bytes.length)break;const length=view.getUint16(offset);if(length<2||offset+length>bytes.length)break;if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&length>=8){height=view.getUint16(offset+3);width=view.getUint16(offset+5);break;}offset+=length;}}
 if(width<16||height<16||width>10000||height>10000||width*height>MAX_OCR_PIXELS)throw new Error('صورة غير صالحة أو كبيرة؛ استخدم PNG أو JPEG حتى 6 ملايين بكسل وبحد أقصى 10000 بكسل للضلع.');
 return {width,height};
}
