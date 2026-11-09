import {describe,it,expect} from 'vitest';
import {pdfOcrPages,pdfOcrViewport} from './pdfOcrPolicy';
describe('PDF OCR bounded selection',()=>{
 it('selects only the requested consecutive pages',()=>expect(pdfOcrPages(3,5,10)).toEqual([3,4,5]));
 it('rejects invalid, excessive or out-of-document selections',()=>{for(const args of [[0,1,10],[1,4,10],[4,3,10],[1,1,101],[9,11,10],[1.5,2,10],[NaN,1,10]])expect(()=>pdfOcrPages(...args as [number,number,number])).toThrow();});
 it('bounds rendered page pixels and maximum side',()=>{for(const [w,h]of [[595,842],[20000,10000],[400,500]]){const scale=pdfOcrViewport(w,h);expect(w*h*scale*scale).toBeLessThanOrEqual(5000001);expect(Math.max(w,h)*scale).toBeLessThanOrEqual(2401);}});
 it('rejects impossible page dimensions',()=>{for(const [w,h]of [[0,100],[Infinity,10],[NaN,10],[20001,2]])expect(()=>pdfOcrViewport(w,h)).toThrow();});
});
