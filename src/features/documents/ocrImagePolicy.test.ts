import {describe,it,expect} from 'vitest';
import {imageDimensions,ocrImageName} from './ocrImagePolicy';
function png(w:number,h:number){const b=new Uint8Array(24),v=new DataView(b.buffer);b.set([137,80,78,71,13,10,26,10]);v.setUint32(8,13);v.setUint32(12,0x49484452);v.setUint32(16,w);v.setUint32(20,h);return b;}
describe('OCR image preflight',()=>{
 it('accepts supported image names only',()=>{expect(ocrImageName('PLAN.JPEG')).toBe(true);expect(ocrImageName('image.png.exe')).toBe(false);expect(ocrImageName('scan.pdf')).toBe(false);});
 it('reads PNG dimensions without decoding',()=>expect(imageDimensions(png(1800,500))).toEqual({width:1800,height:500}));
 it('rejects pixel bombs and invalid dimensions',()=>{for(const [w,h] of [[10000,10000],[0,500],[10001,20],[15,100]])expect(()=>imageDimensions(png(w,h))).toThrow();});
 it('rejects malformed headers',()=>{expect(()=>imageDimensions(new Uint8Array())).toThrow();const b=png(100,100);b[0]=0;expect(()=>imageDimensions(b)).toThrow();});
 it('reads JPEG start-of-frame and rejects truncated segment',()=>{const b=new Uint8Array([255,216,255,192,0,8,8,1,244,7,8,1]);expect(imageDimensions(b)).toEqual({width:1800,height:500});expect(()=>imageDimensions(b.slice(0,10))).toThrow();});
});
