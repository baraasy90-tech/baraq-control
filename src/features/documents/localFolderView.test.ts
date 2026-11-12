import {expect,it} from 'vitest';
import {localFolderPage,type LocalFolderRow} from './localFolderView';
it('filters names literally without requiring an index and keeps original names',()=>{
 const rows:LocalFolderRow[]=[{name:'PLAN[1].DWG',kind:'file'},{name:'مخطط الواجهة.pdf',kind:'file'}];
 expect(localFolderPage(rows,'plan[1]',0).rows).toEqual([rows[0]]);
 expect(localFolderPage(rows,'الواجهة',0).rows).toEqual([rows[1]]);
 expect(localFolderPage(rows,'.*',0).total).toBe(0);
});
it('puts folders first and orders numbered names naturally without mutating the input',()=>{
 const rows:LocalFolderRow[]=[{name:'10.txt',kind:'file'},{name:'2.txt',kind:'file'},{name:'Z',kind:'directory'}];
 expect(localFolderPage(rows,'',0).rows.map(r=>r.name)).toEqual(['Z','2.txt','10.txt']);
 expect(rows[0].name).toBe('10.txt');
});
it('limits rendering to 100 rows and clamps pages after filtering or removal',()=>{
 const rows:LocalFolderRow[]=Array.from({length:205},(_,i)=>({name:`file-${i}`,kind:'file'}));
 expect(localFolderPage(rows,'',0).rows).toHaveLength(100);
 expect(localFolderPage(rows,'',2).rows).toHaveLength(5);
 expect(localFolderPage(rows,'file-204',2)).toMatchObject({total:1,page:0,pages:1});
 expect(localFolderPage([], '',-5)).toMatchObject({total:0,page:0,pages:1,rows:[]});
});
