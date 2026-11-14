import {expect,it} from 'vitest';
import {mergeReviewedPdfText,validReviewedPdfPages} from './reviewedPdfMerge';
it('retains reviewed text and combines disjoint page coverage without changing inputs',()=>{
 const pages=[4,5],next=[1,2];const result=mergeReviewedPdfText('السابق',pages,'الجديد',next);
 expect(result.text).toContain('السابق');expect(result.text).toContain('الجديد');expect(result.pages).toEqual([1,2,4,5]);expect(pages).toEqual([4,5]);
});
it('rejects overlapping pages rather than silently duplicating or discarding reviewed content',()=>{
 expect(()=>mergeReviewedPdfText('old',[1,2],'new',[2,3])).toThrow(/تتداخل/);
});
it('rejects oversized combined text and invalid page coverage',()=>{
 expect(()=>mergeReviewedPdfText('a'.repeat(199999),[1],'new',[2])).toThrow(/200000/);
 for(const pages of [[],[0],[101],[1,1],[2,1],[1.2]])expect(validReviewedPdfPages(pages)).toBe(false);
 expect(validReviewedPdfPages([1,4,100])).toBe(true);
});
