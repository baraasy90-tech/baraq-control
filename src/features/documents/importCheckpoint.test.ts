import {expect,it} from 'vitest';
import {reattachCopySources,type SavedCopy} from './importCheckpoint';
const original=new File(['source'],'a.txt',{lastModified:100});
const saved:SavedCopy={id:'batch',scope:'scope',projectId:'project',parentId:null,createdAt:'test',jobs:[{id:'original-id',path:['a.txt'],file:{name:'a.txt',size:6,lastModified:100},status:'done',sourceFingerprint:{bytes:6,crc32:'12345678'}}]};
it('reattaches sources retaining identifiers and rechecking completed jobs',()=>{
 const jobs=reattachCopySources(saved,[{path:['a.txt'],file:original}]);expect(jobs[0]).toMatchObject({id:'original-id',status:'queued',uploaded:false,sourceFingerprint:{bytes:6,crc32:'12345678'}});
});
it('rejects changed metadata and incomplete or duplicate selections',()=>{
 expect(()=>reattachCopySources(saved,[])).toThrow();
 expect(()=>reattachCopySources(saved,[{path:['a.txt'],file:new File(['source'],'a.txt',{lastModified:200})}])).toThrow('اختلف');
 expect(()=>reattachCopySources(saved,[{path:['a.txt'],file:original},{path:['a.txt'],file:original}])).toThrow();
});
